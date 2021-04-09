/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { Intent, IntentRequest, Request } from 'ask-sdk-model';
import _ from 'lodash';
import { DeepRequired, falseIfGuardFailed, InputUtil, okIf, unpackGeneralControlIntent } from '..';
import { Strings as $ } from '../constants/Strings';
import { ListFormatting } from '../intl/ListFormat';
import { Logger } from '../logging/Logger';
import { DisambiguateTargetAct } from '../systemActs/InitiativeActs';
import { assert } from '../utils/AssertionUtils';
import { evaluateInputHandlers, findControlById } from '../utils/ControlUtils';
import { GuardFailed } from '../utils/Predicates';
import {
    Control,
    ControlInputHandler,
    ControlInputHandlingProps,
    ControlProps,
    ControlState,
} from './Control';
import { ControlInput } from './ControlInput';
import { ControlResultBuilder } from './ControlResult';
import { ControlIdentifierType } from './enums/ControlIdentifierType';
import { RenderType } from './enums/RenderType';
import { IContainerControl } from './interfaces/IContainerControl';
import { ControlStateDiagramming } from './mixins/ControlStateDiagramming';

const log = new Logger('AskSdkControls:ContainerControl');

/**
 * Records the last child control that took initiative.
 *
 * Purpose:
 *  - for the MRU delegation strategy which biases to the child that most recently took
 *    initiative.
 *
 */
interface MostRecentChildInitiativeInfo {
    controlId: string;
    turnNumber: number;
}

/**
 * Records information regarding ongoing target-disambiguation
 */
interface TargetDisambiguationInfo {
    type: 'TargetDisambiguation';
    turnNumber: number;
    candidates: TargetDisambiguationCandidate[];
    ambiguousRequest: Request;
}
interface TargetDisambiguationCandidate {
    controlId: string;
    specificTarget: string;
}

type ActiveDisambiguationInfo = TargetDisambiguationInfo; // this type is in anticipation of supporting other kinds of disambiguation

/**
 * Container state for use in arbitration
 */
export class ContainerControlState implements ControlState {
    value: any;
    mostRecentChildInitiativeInfo?: MostRecentChildInitiativeInfo;

    activeDisambiguationInfo?: ActiveDisambiguationInfo;
}

/**
 * Defines the mandatory props of a ContainerControl.
 */
export class ContainerControlProps implements ControlProps {
    id: string;

    dialog?: ContainerControlDialogProps;

    inputHandling?: ContainerControlInputHandlingProps;
}

export enum ImplicitResolutionStrategy {
    FirstMatch = 'firstMatch',
    MostRecentInitiative = 'mostRecentInitiative',
}

export class ContainerControlDialogProps {
    explicityResolveTargetAmbiguity?: boolean; // TODO | func to boolean.

    // TODO: make this a function of candidates -> selection so that developer can implement their own.
    //       and convert enum to built-in strategies.
    implicitResolutionStrategy?: ImplicitResolutionStrategy; // TODO: | ((candidates: Control[], controlInput: ControlInput) => HandlingAmbiguityStrategy)
}

export interface ContainerControlInputHandlingProps extends ControlInputHandlingProps {
    //jsDocs on ControlInputHandlingProps
    customHandlingFuncs?: ControlInputHandler[];
}

/**
 *  A control that uses and manages child controls.
 *
 *  Default logic of `decideHandlingChild()` & `decideInitiativeChild()`:
 *   1. Choose the most-recent initiative control if is a candidate.
 *   2. Otherwise, choose the first candidate in the positional order of the
 *      `this.children` array.
 *   3. In the special case of `input = FallbackIntent`, only the most-recent
 *      initiative control is considered. If it is not a candidate, then no
 *      child is selected.
 *
 *  Usage:
 *  - Container controls can and should add high-level behaviors and respond to
 *    high-level requests such as multi-valued intents.
 *
 *  - Container controls should forward simple inputs to the child controls
 *    whenever possible in order to share the load and achieve scalable logic.
 *
 *  - Container controls should explicitly decide which child will handle an
 *    input or take the initiative in situations where there are multiple
 *    children that respond `canHandle = true` or `canTakeInitiative = true`.
 *
 */
export class ContainerControl extends Control implements IContainerControl, ControlStateDiagramming {
    state: ContainerControlState;
    children: Control[] = [];

    rawProps: ContainerControlProps;
    props: DeepRequired<ContainerControlProps>;
    selectedHandlingChild: Control | undefined;
    selectedInitiativeChild: Control | undefined;

    protected handleFunc?: (input: ControlInput, resultBuilder: ControlResultBuilder) => void | Promise<void>;
    handlerCandidates: Control[];
    disambiguationQuestion?: TargetDisambiguationInfo;

    // jsDoc: see `Control`
    constructor(props: ContainerControlProps) {
        //TODO: add this to the other standard controls.  // STALE COMMENT?
        super(props.id);
        this.rawProps = props;
        this.props = ContainerControl.mergeWithDefaultProps(props);
    }

    // jsDoc: see `Control`
    reestablishState(state: any, controlStateMap: { [index: string]: any }): void {
        if (state !== undefined) {
            this.setSerializableState(state);
        }
        for (const child of this.children) {
            child.reestablishState(controlStateMap[child.id], controlStateMap);
        }
    }

    /**
     * Merges the user-provided props with the default props.
     *
     * Any property defined by the user-provided data overrides the defaults.
     */
    static mergeWithDefaultProps(props: ContainerControlProps): DeepRequired<ContainerControlProps> {
        const defaults: DeepRequired<ContainerControlProps> = {
            id: 'dummy',
            dialog: {
                explicityResolveTargetAmbiguity: false,
                implicitResolutionStrategy: ImplicitResolutionStrategy.MostRecentInitiative,
            },
            inputHandling: {
                customHandlingFuncs: [],
            },
        };
        return _.merge(defaults, props);
    }

    /**
     * Add a control as a child.
     *
     * The control is appended to the end of the `this.children` array.
     *
     * @param control - Control
     * @returns the container
     */
    addChild(control: Control): this {
        this.children.push(control);
        return this;
    }

    standardInputHandlers: ControlInputHandler[] = [
        {
            name: 'TargetAmbiguityRequiringExplicitResolution (built-in)',
            canHandle: this.isTargetAmbiguityRequiringExplicitResolution,
            handle: this.handleTargetAmbiguityRequiringExplicitResolution,
        },
        {
            name: 'AnswerToExplicitTargetDisambiguation (built-in)',
            canHandle: this.isAnswerToExplicitTargetDisambiguation,
            handle: this.handleAnswerToExplicitTargetDisambiguation,
        },
        {
            name: 'DirectDelegationToChild (built-in)',
            canHandle: this.canDirectlyDelegateToChild,
            handle: this.handleDirectDelegationToChild, // TODO: need to clean up previous tracking.
        },
    ];

    // tsDoc - see Control
    async canHandle(input: ControlInput): Promise<boolean> {
        this.handlerCandidates = await this.gatherHandlingCandidates(input);
        return evaluateInputHandlers(this, input);
    }

    // jsDoc: see `Control`
    async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        if (this.handleFunc === undefined) {
            log.error('ListControl: handle called but no clause matched.  are canHandle/handle out of sync?');
            const intent: Intent = (input.request as IntentRequest).intent;
            throw new Error(`${intent.name} can not be handled by ${this.constructor.name}.`);
        }

        await this.handleFunc(input, resultBuilder);
        if (resultBuilder.hasInitiativeAct() !== true && (await this.canTakeInitiative(input)) === true) {
            await this.takeInitiative(input, resultBuilder);
        }
    }

    async isTargetAmbiguityRequiringExplicitResolution(input: ControlInput): Promise<boolean> {
        /*
            Form questions like 
              1. "did you mean pizza1 or pizza2"
              2. "did you mean the first item or the first pizza?"
            
            or statements like
              3. I'm not sure what you mean. Could you be a little more specific.
              4. I'm not sure if you are trying to change something or talk about change you will receive. Could you be a little more specific.


            Lets start by looking for specific common patterns, such as unspecified target ambiguity            
        */
        try {
            okIf(this.handlerCandidates !== undefined);
            okIf(this.handlerCandidates.length > 1);
            okIf(this.props.dialog.explicityResolveTargetAmbiguity === true);

            okIf(InputUtil.isControlIntent(input));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );

            // Check that the target is undefined or that all candidates share the target.
            if (target !== undefined) {
                for (const candidate of this.handlerCandidates) {
                    if (!candidate.getAllTargets().includes(target)) {
                        throw new GuardFailed('The candidates do not all share the user-specified target.');
                    }
                }
            }

            // create simple array of {control -> specificTarget} mappings for validations and serialization.
            const simplifiedCandidateList: TargetDisambiguationCandidate[] = this.handlerCandidates.map(
                (x) => ({ controlId: x.id, specificTarget: x.__getSpecificTarget() }),
            );

            // Check that there are no duplicates in the set of specific targets
            const specificTargetsSet: Set<string> = new Set<string>();
            for (const candidate of simplifiedCandidateList) {
                if (specificTargetsSet.has(candidate.specificTarget)) {
                    throw new Error(
                        'Trying to perform explicit target disambiguation but the candidates have same `specificTarget`',                        
                    );
                }
                specificTargetsSet.add(candidate.specificTarget);
            }

            // Everything looks good.  record the plan and return true.
            this.disambiguationQuestion = {
                type: 'TargetDisambiguation',
                turnNumber: input.turnNumber,
                candidates: simplifiedCandidateList,
                ambiguousRequest: input.request,
            };
            log.debug(`${this.id} canHandle=true. AskTargetDisambiguation`);
            return true;
        } catch (err) {
            return falseIfGuardFailed(err);
        }
    }

    async handleTargetAmbiguityRequiringExplicitResolution(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        if (
            this.disambiguationQuestion === undefined ||
            this.disambiguationQuestion.type !== 'TargetDisambiguation'
        ) {
            throw new Error(
                "this.disambiguationQuestion should have been set to 'AskTargetDisambiguation' in isTargetAmbiguity",
            );
        }

        assert(this.disambiguationQuestion !== undefined);

        // record what we did in the state
        this.state.activeDisambiguationInfo = this.disambiguationQuestion;

        const specificTargets = this.disambiguationQuestion.candidates.map((x) => x.specificTarget);
        const individuallyRenderedSpecificTargets = this.disambiguationQuestion.candidates.map((x) =>
            input.controls[x.controlId].renderIdentifier(
                input,
                x.specificTarget,
                ControlIdentifierType.TARGET,
                RenderType.PROMPT,
            ),
        );
        const renderedSpecificTargets = ListFormatting.format(individuallyRenderedSpecificTargets, 'or');

        // add the act
        resultBuilder.addAct(
            new DisambiguateTargetAct(this, { specificTargets: specificTargets, renderedSpecificTargets }),
        );
    }

    private isAnswerToExplicitTargetDisambiguation(input: ControlInput): any {
        try {
            okIf(InputUtil.isControlIntent(input));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsDefined(target));
            okIf(InputUtil.actionIsMatchOrUndefined(action, [$.Action.Select])); //todo: make it a nlu capability prop.
            okIf(this.state.activeDisambiguationInfo?.type === 'TargetDisambiguation');
            this.state.activeDisambiguationInfo.candidates.some((x) => x.specificTarget === target);
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleAnswerToExplicitTargetDisambiguation(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): void {
        const { feedback, action, target } = unpackGeneralControlIntent(
            (input.request as IntentRequest).intent,
        );
        assert(target !== undefined);
        assert(this.state.activeDisambiguationInfo?.type === 'TargetDisambiguation');
        const matches = this.state.activeDisambiguationInfo.candidates.filter(
            (x) => x.specificTarget === target,
        );
        assert(matches.length === 1);
        const targetControlId = matches[0].controlId;
        const targetControl = input.controls[targetControlId];

        const ambiguousRequest = this.state.activeDisambiguationInfo.ambiguousRequest;
        input.replaceRequest(ambiguousRequest);

        const canHandle = targetControl.canHandle(input); // always call canHandle before handle
        if (!canHandle) {
            throw Error(
                `Child that previously said it could handle an ambiguous input is now saying it cannot. targetControl=${JSON.stringify(
                    targetControl,
                )}. ambiguousRequest=${JSON.stringify(ambiguousRequest)}`,
            );
        }
        targetControl.handle(input, resultBuilder);
    }

    /**
     * Determines if a child control can handle the request.
     *
     * From the candidates that report `canHandle = true`, a winner is selected
     * by `this.decideHandlingChild(candidates)`.
     *
     * The selected "winner" is recorded in `this.selectedHandlingChild`.
     *
     * @param input - Input
     */
    //TODO: rename: canHandleAsContainer...
    private async canDirectlyDelegateToChild(input: ControlInput): Promise<boolean> {
        const candidates = await this.gatherHandlingCandidates(input);
        try {
            okIf(
                candidates.length === 1 ||
                    (candidates.length > 1 && this.props.dialog.explicityResolveTargetAmbiguity === false),
            );

            this.selectedHandlingChild = await this.decideHandlingChild(candidates, input);
            if (this.selectedHandlingChild !== undefined) {
                log.debug(
                    `${this.id} canHandleByChild=true. selectedHandlingChild = ${this.selectedHandlingChild.id}`,
                );
                return true;
            }

            log.debug(`${this.id} canHandleByChild=false.`);
            return false;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    /**
     * Delegates handling of the request to the child control selected during
     * canHandleByChild.
     *
     * @param input - Input
     * @param resultBuilder - Response builder.
     */
    //TODO: rename: handleAsContainer
    private async handleDirectDelegationToChild(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        if (this.selectedHandlingChild !== undefined) {
            await this.selectedHandlingChild.handle(input, resultBuilder);

            if (resultBuilder.hasInitiativeAct()) {
                this.state.mostRecentChildInitiativeInfo = {
                    controlId: this.selectedHandlingChild.id,
                    turnNumber: input.turnNumber,
                };
            }
        }
        return;
    }

    /**
     * Calls canHandle on each child control to determine the candidates for
     * delegation.
     * @param input - Input
     */
    async gatherHandlingCandidates(input: ControlInput): Promise<Control[]> {
        const candidates: Control[] = [];
        for (const child of this.children) {
            const response = await child.canHandle(input);
            if (response) {
                candidates.push(child);
            }
        }
        return candidates;
    }

    /**
     * Decide a winner from the canHandle candidates using implicit logic.
     *
     * The candidates should be all the child controls for which `canHandle(input) = true`
     *
     * Default logic (ImplicitResolutionStrategy.MostRecentInitiative):
     *  1. Choose the most-recent initiative control if is a candidate.
     *  2. Otherwise, choose the first candidate in the positional order of the
     *     `this.children` array.
     *  3. In the special case of input===FallbackIntent, only the most-recent initiative
     *     control is considered. If the MRU control is not a candidate then no child is
     *     selected and this method returns `undefined`.
     *
     * Remarks:
     *  * The special case for FallbackIntent exists because that intent is not
     *    user-initiative -- rather it indicates a failure to understand the user.  In
     *    cases of misunderstanding it doesn't make sense for an inactive control to answer.
     *
     * @param candidates - The child controls that reported `canHandle = true`
     * @param input - Input
     */
    async decideHandlingChild(candidates: Control[], input: ControlInput): Promise<Control | undefined> {
        if (candidates.length === 0) {
            return undefined;
        }

        if (InputUtil.isFallbackIntent(input)) {
            const last = findControlById(candidates, this.state.mostRecentChildInitiativeInfo?.controlId);
            return last ? last : undefined;
        }

        switch (this.props.dialog.implicitResolutionStrategy) {
            case ImplicitResolutionStrategy.FirstMatch:
                return candidates[0];
            case ImplicitResolutionStrategy.MostRecentInitiative:
                const mruMatch = findControlById(
                    candidates,
                    this.state.mostRecentChildInitiativeInfo?.controlId,
                );
                return mruMatch ?? candidates[0];
        }
    }

    // jsDoc: see `Control`
    async canTakeInitiative(input: ControlInput): Promise<boolean> {
        return this.canTakeInitiativeByChild(input);
    }

    // jsDoc: see `Control`
    async takeInitiative(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        return this.takeInitiativeByChild(input, resultBuilder);
    }

    // jsDoc: see `ControlStateDiagramming`
    stringifyStateForDiagram(): string {
        return ''; // nothing special to report.
    }

    /**
     * Determines if a child control can take the initiative.
     *
     * From the candidates that report `canTakeInitiative = true`, a winner is selected
     * by `this.decideInitiativeChild(candidates)`.
     *
     * The selected "winner" is recorded in `this.selectedInitiativeChild`.
     *
     * @param input - Input
     */
    async canTakeInitiativeByChild(input: ControlInput): Promise<boolean> {
        const candidates = await this.gatherInitiativeCandidates(input);
        this.selectedInitiativeChild = await this.decideInitiativeChild(candidates, input);
        if (this.selectedInitiativeChild !== undefined) {
            log.debug(
                `${this.id} canTakeInitiative=true. this.selectedInitiativeChild = ${this.selectedInitiativeChild.id}`,
            );
            return true;
        } else {
            log.debug(`${this.id} canTakeInitiative=false. No child wants it`);
            return false;
        }
    }

    /**
     * Delegates initiative generation to the child control selected during
     * canHandleByChild.
     *
     * @param input - Input
     * @param resultBuilder - Response builder.
     */
    async takeInitiativeByChild(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        if (!this.selectedInitiativeChild) {
            throw new Error(
                'this.selectedInitiativeChild is undefined. Did you call canTakeInitiative() first? Did it update this.selectedInitiativeChild?',
            );
        }
        await this.selectedInitiativeChild.takeInitiative(input, resultBuilder);
        this.state.mostRecentChildInitiativeInfo = {
            controlId: this.selectedInitiativeChild.id,
            turnNumber: input.turnNumber,
        };

        return;
    }

    /**
     * Calls canTakeInitiative on each child control to determine the candidates
     * for delegation.
     * @param input - Input
     */
    async gatherInitiativeCandidates(input: ControlInput): Promise<Control[]> {
        const candidates: Control[] = [];
        for (const child of this.children) {
            const response = await child.canTakeInitiative(input);
            if (response) {
                candidates.push(child);
            }
        }
        return candidates;
    }

    /**
     * Decide a winner from the canTakeInitiative candidates.
     *
     * The eligible candidates are child controls for which
     * `canTakeInitiative(input) = true`.
     *
     * Default logic:
     *  1. choose the most-recent initiative control if is a candidate.
     *  2. otherwise choose the first candidate in the positional order of the
     *     `this.children` array.
     *
     * @param candidates - The child controls that reported `canTakeInitiative = true`
     * @param input - Input
     */
    async decideInitiativeChild(candidates: Control[], input: ControlInput): Promise<Control | undefined> {
        if (candidates.length === 0) {
            return undefined;
        }

        const handlingControlMatch = findControlById(
            candidates,
            this.state.mostRecentChildInitiativeInfo?.controlId,
        );
        if (handlingControlMatch !== undefined) {
            return handlingControlMatch;
        }

        const mruMatch = findControlById(candidates, this.state.mostRecentChildInitiativeInfo?.controlId);
        return mruMatch ?? candidates[0];
    }
}
