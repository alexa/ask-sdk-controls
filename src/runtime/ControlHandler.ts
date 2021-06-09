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

import { HandlerInput, RequestHandler, UserAgentManager } from 'ask-sdk-core';
import { Response } from 'ask-sdk-model';
import fs from 'fs';
import _ from 'lodash';
import { IControlResult, requestToString } from '..';
import { ControlInput } from '../controls/ControlInput';
import { ControlResultBuilder } from '../controls/ControlResult';
import { ControlServices, ControlServicesProps } from '../controls/ControlServices';
import { isContainerControl } from '../controls/interfaces/IContainerControl';
import { IControl } from '../controls/interfaces/IControl';
import { IControlInput } from '../controls/interfaces/IControlInput';
import { IControlManager } from '../controls/interfaces/IControlManager';
import { IControlResultBuilder } from '../controls/interfaces/IControlResultBuilder';
import { ILogger } from '../controls/interfaces/ILogger';
import { ControlResponseBuilder } from '../responseGeneration/ControlResponseBuilder';
import { generateControlTreeTextDiagram } from '../utils/ControlTreeVisualization';
import { visitControls } from '../utils/ControlVisitor';
import { validateSerializedState } from '../utils/SerializationValidator';
import { SessionBehavior } from './SessionBehavior';

const MODULE_NAME = 'AskSdkControls:ControlHandler';
/**
 * Session context information in addition to that provided by Alexa Service.
 */
class AdditionalSessionContext {
    turnNumber: number = 0;
}

export type CanHandleExceptionBehavior = 'ProduceResponse' | 'ReturnFalse' | 'Rethrow';

/**
 * RequestHandler for a skill built using Controls.
 *
 * This is the common runtime that drives the processing flow for a skill that
 * uses Controls.  Please see the user guide for a thorough discussion of the
 * phases of processing and how the common `ControlHandler` interfaces with
 * an instance of `ControlManager` and the control tree.
 *
 */
export class ControlHandler implements RequestHandler {
    static attributeNameContext = '__controlContext';

    controlManager: IControlManager;
    rootControl?: IControl;

    private additionalSessionContext: AdditionalSessionContext;
    private controlInput: IControlInput;

    private preparedRequestId: string | undefined;

    /**
     * Determines if the controls state will be correctly reestablished on the
     * next turn
     *
     * Usage:
     *  * If a skill uses more than one ControlHandler the state validation
     *    procedure gets confused due to unexpected control states in session
     *    attributes. In this situation, set `validateStateRoundtrip = false`.
     */
    validateStateRoundtrip = true; // TODO improve the validation testing and remove this

    /**
     * Behavior if an exception occurs during ControlHandler.canHandle.
     *
     * In all cases, `ControlManager.handleInternalError` will be called.  The options
     * differ in how the response is produced.
     *
     * ProduceResponse (default) - treat the input as handled, and return the custom response
     * ReturnFalse - treat the input as 'cannot handle'.
     * Rethrow - let the exception bubble up to be processed by `CustomSkill.errorHandlers`
     *
     * Usage:
     *  - The default, 'ProduceResponse', allows ControlManager
     */
    canHandleThrowBehavior: CanHandleExceptionBehavior = 'ProduceResponse';
    protected canHandleFailureResponse?: Response;

    /**
     * The services props used to set global configuration
     * to be used across all Controls.
     */
    services: ControlServicesProps;

    /**
     * The logger implementation.
     */
    log: ILogger;

    constructor(controlManager: IControlManager, services?: ControlServicesProps) {
        this.controlManager = controlManager;
        if (services !== undefined) {
            ControlServices.setDefaults(services);
        }
        this.services = services ?? ControlServices.getDefaults();
        this.log = this.services.logger.getLogger(MODULE_NAME);
    }

    private async prepare(handlerInput: HandlerInput): Promise<void> {
        if (this.preparedRequestId === handlerInput.requestEnvelope.request.requestId) {
            return; // don't prepare again for the same requestId.
        }
        this.preparedRequestId = handlerInput.requestEnvelope.request.requestId;

        // retrieve and update the context object.
        const retrievedContext = handlerInput.attributesManager.getSessionAttributes()[
            ControlHandler.attributeNameContext
        ];
        this.additionalSessionContext =
            retrievedContext !== undefined ? JSON.parse(retrievedContext) : new AdditionalSessionContext();
        this.additionalSessionContext.turnNumber += 1;

        // rebuild the control tree
        this.rootControl = this.controlManager.createControlTree();
        const stateMap = await this.controlManager.loadControlStateMap(handlerInput);
        this.controlManager.reestablishControlStates(this.rootControl, stateMap);

        // create the input object for use in the main processing.
        const controlsMap = ControlHandler.createControlMap(this.rootControl, {});
        this.controlInput = new ControlInput(
            handlerInput,
            this.additionalSessionContext.turnNumber,
            controlsMap,
        );

        // userAgent setup
        UserAgentManager.registerComponent(this.userAgentInfo());
    }

    private static createControlMap(
        control: IControl,
        mapAccumulator: { [index: string]: IControl },
    ): { [index: string]: IControl } {
        mapAccumulator[control.id] = control;
        if (isContainerControl(control)) {
            for (const child of (control as any).children) {
                ControlHandler.createControlMap(child, mapAccumulator);
            }
        }
        return mapAccumulator; // returning the accumulator makes the call-site more readable
    }

    /**
     * Determines if this RequestHandler handle the input.
     *
     * @param handlerInput - HandlerInput
     */
    async canHandle(handlerInput: HandlerInput): Promise<boolean> {
        try {
            await this.prepare(handlerInput);
            return this.rootControl!.canHandle(this.controlInput);
        } catch (error) {
            const responseBuilder = new ControlResponseBuilder(handlerInput.responseBuilder);
            if (this.controlManager.handleInternalError) {
                this.controlManager.handleInternalError(this.controlInput, error, responseBuilder);
            }

            if (this.canHandleThrowBehavior === 'ProduceResponse') {
                this.canHandleFailureResponse = responseBuilder.build();
                return true; // return true and generate the response in handle.
            } else if (this.canHandleThrowBehavior === 'ReturnFalse') {
                return false; // silent
            } else {
                throw error; // rethrow to top-level
            }
        }
    }

    /**
     * Handle the input.
     *
     * @param handlerInput - HandlerInput
     */
    async handle(handlerInput: HandlerInput, processInput = true): Promise<Response> {
        if (this.canHandleFailureResponse !== undefined) {
            return this.canHandleFailureResponse;
        }

        const responseBuilder = new ControlResponseBuilder(handlerInput.responseBuilder);
        try {
            await this.prepare(handlerInput);

            /*
             * Process the turn through the application.
             * Do the work (state updates and dialog policy)
             */

            const resultBuilder = new ControlResultBuilder();
            await ControlHandler.handleCore(
                this.rootControl!,
                this.controlInput,
                this.preparedRequestId,
                resultBuilder,
                processInput,
                this.services,
            );

            // Compose the response
            const response = await this.buildResponseCore(
                resultBuilder.build(),
                responseBuilder,
                this.controlInput,
            );

            // Collate the Control state objects for serialization

            /* Note: we merge onto the prevailing state for the edge-case of multiple ControlHandlers in the skill that are active on different turns.
             *       merging avoid one controlHandler stomping on the state of the other.  Context is currently OK/good to be stomped on.
             */
            const priorStateMap = await this.controlManager.loadControlStateMap(handlerInput);
            const currentStateMap = this.getSerializableControlStates();
            const mergedStateMap = { ...priorStateMap, ...currentStateMap };

            const stateToSaveJson = JSON.stringify(mergedStateMap, null, 2);
            this.log.logObject('info', 'Saving state...', this.log.sanitize(mergedStateMap));

            const contextToSaveJson = JSON.stringify(this.additionalSessionContext, null, 2);
            this.log.logObject('info', 'Saving context...', this.log.sanitize(this.additionalSessionContext));

            await this.controlManager.saveControlStateMap(stateToSaveJson, handlerInput);

            this.controlInput.handlerInput.attributesManager.getSessionAttributes()[
                ControlHandler.attributeNameContext
            ] = contextToSaveJson;

            // Check that the serialized state will survive the round trip
            if (this.validateStateRoundtrip) {
                validateSerializedState(stateToSaveJson, this.controlManager, this.controlInput);
            }

            //write out response for debugging
            if (process.env.ASK_SDK_CONTROLS_LOG_RESPONSE_FILEPATH !== undefined) {
                fs.writeFileSync(
                    process.env.ASK_SDK_CONTROLS_LOG_RESPONSE_FILEPATH,
                    JSON.stringify(response, null, 2),
                );
            }

            return response;
        } catch (error) {
            if (this.controlManager.handleInternalError) {
                this.controlManager.handleInternalError(this.controlInput, error, responseBuilder);
            }

            const response = await this.buildResponseCore(undefined, responseBuilder, this.controlInput);

            return response;
        }
    }

    /**
     * Creates a string 'C:<nControls>' for inclusion in UserAgent to indicate usage.
     *
     * The information gathered is only the number of Controls being used.
     * This will help the dev team to understand usage - thank you!
     */
    userAgentInfo(): string {
        const rootControl = this.rootControl ?? this.controlManager.createControlTree();
        let nControls = 0;
        visitControls(rootControl, () => {
            nControls++;
        });
        return `nCtrl:${nControls}`;
    }

    /**
     * Implements the core of the processing loop
     *
     * Public for testing
     */
    public static async handleCore(
        rootControl: IControl,
        input: IControlInput,
        preparedRequestId: string | undefined,
        resultBuilder: IControlResultBuilder,
        handleInput = true,
        services: ControlServicesProps,
    ): Promise<void> {
        const log = services.logger.getLogger(MODULE_NAME);
        log.info(
            '-------------------------------------------------------------------------------------------------',
        );
        log.info(`Turn ${input.turnNumber} started`);
        const inputRequest = input.handlerInput.requestEnvelope.request;
        log.logObject('info', 'Input:', log.sanitize(requestToString(inputRequest)));
        log.info(`UI at start: \n${generateControlTreeTextDiagram(rootControl, input.turnNumber)}`);

        if (handleInput) {
            // call canHandle only if we didn't go through top-level canHandle/prepare.
            if (preparedRequestId !== input.handlerInput.requestEnvelope.request.requestId) {
                const canHandleResponse = await rootControl.canHandle(input);
                if (!canHandleResponse) {
                    log.warn(' *WARN* rootControl returned canHandle=false.  Closing session');
                    log.info(
                        `UI at end of turn: \n${generateControlTreeTextDiagram(
                            rootControl,
                            input.turnNumber,
                        )}`,
                    );
                    return;
                }
            }

            // HANDLE
            await rootControl.handle(input, resultBuilder);
        }

        // Optional INITIATIVE PHASE
        if (!resultBuilder.hasInitiativeAct() && resultBuilder.sessionBehavior === SessionBehavior.OPEN) {
            await ControlHandler.initiativePhase(rootControl, input, resultBuilder, services);
        }

        // TODO: track the specific controlID that generated the initiative. make it available so that controls
        // can use a hasInitiative() predicate and reason about whether they are actively running the conversation.

        // TODO: Formatting to be fix
        log.logObject('info', 'HandleResponse: ', log.sanitize(resultBuilder), false);
        log.info(`UI at end of turn: \n${generateControlTreeTextDiagram(rootControl, input.turnNumber)}`);
    }

    private static async initiativePhase(
        rootControl: IControl,
        input: IControlInput,
        resultBuilder: IControlResultBuilder,
        services: ControlServicesProps,
    ): Promise<void> {
        const log = services.logger.getLogger(MODULE_NAME);
        log.debug(
            `UI at start of initiative phase: \n${generateControlTreeTextDiagram(
                rootControl,
                input.turnNumber,
            )}`,
        );
        const canTakeInitiative = await rootControl.canTakeInitiative(input);
        if (canTakeInitiative) {
            await rootControl.takeInitiative(input, resultBuilder);

            if (!resultBuilder.hasInitiativeAct()) {
                throw new Error(
                    'Something responded with `canTakeInitiative=true` but no initiative item was produced.',
                );
            }
        } else {
            log.debug('End of handle: nothing wanted to take initiative.');
        }

        return;
    }

    /**
     * Take the initiative in the dialog.
     *
     * Any existing content in the Response's prompt & reprompt is overwritten.
     * To avoid losing this content, pass it in using parameters promptPrefix &
     * repromptPrefix.
     *
     * Usage:
     *  * This method is used to transition from a regular `RequestHandler` into
     *    Controls For example, when a regular `RequestHandler` consumes the
     *    input but doesn't want to keep the initiative, it can ask a
     *    ControlHandler to take the initiative to complete the turn.  A
     *    prompt/reprompt fragment can be specified by the `RequestHandler`
     *    which will be included as the start of the overall prompt/reprompt.
     *
     * @param handlerInput - Handler input
     * @param promptPrefix - Prompt fragment to prefix the prompt generated via
     * Controls.
     * @param repromptPrefix - Reprompt fragment to prefix to the prompt
     * generated via Controls
     */
    public async takeInitiative(
        handlerInput: HandlerInput,
        promptPrefix: string,
        repromptPrefix?: string,
    ): Promise<Response> {
        if (repromptPrefix === undefined) {
            repromptPrefix = promptPrefix;
        }

        /* NOTE: we call handle(.., false) rather than directly calling initiativePhase() as we need all
         * the usual turn book-keeping (prepare, logging, state loading & saving) to occur
         */
        const response = await this.handle(handlerInput, false);
        const [prompt, reprompt] = ControlHandler.getPromptAndRepromptFromResponse(response);

        if (response.outputSpeech === undefined) {
            response.outputSpeech = { type: 'PlainText', text: promptPrefix };
        } else if (response.outputSpeech.type === 'SSML') {
            response.outputSpeech = {
                type: 'SSML',
                ssml: prompt.replace('<speak>', `<speak>${promptPrefix}`),
            };
        } else {
            response.outputSpeech = { type: 'PlainText', text: promptPrefix + prompt };
        }

        if (response.reprompt === undefined) {
            response.reprompt = { outputSpeech: { type: 'PlainText', text: repromptPrefix } };
        } else if (response.reprompt.outputSpeech.type === 'SSML') {
            response.reprompt.outputSpeech = {
                type: 'SSML',
                ssml: reprompt.replace('<speak>', `<speak>${repromptPrefix}`),
            };
        } else {
            response.reprompt.outputSpeech = { type: 'PlainText', text: repromptPrefix + reprompt };
        }

        return response;
    }

    static getPromptAndRepromptFromResponse(response: Response): [string, string] {
        const prompt =
            response.outputSpeech === undefined
                ? ''
                : response.outputSpeech.type === 'SSML'
                ? response.outputSpeech.ssml.replace('<ssml>', '').replace('</ssml>', '')
                : response.outputSpeech.text;

        const reprompt =
            response.reprompt === undefined
                ? ''
                : response.reprompt.outputSpeech.type === 'SSML'
                ? response.reprompt.outputSpeech.ssml.replace('<ssml>', '').replace('</ssml>', '')
                : response.reprompt.outputSpeech.text;
        return [prompt, reprompt];
    }

    private async buildResponseCore(
        result: IControlResult | undefined,
        controlResponseBuilder: ControlResponseBuilder,
        input: IControlInput,
    ): Promise<Response> {
        if (result) {
            await this.controlManager.render(result, input, controlResponseBuilder);
        }
        const response = controlResponseBuilder.getResponse();
        if (result) {
            switch (result.sessionBehavior) {
                case SessionBehavior.OPEN:
                    response.shouldEndSession = false;
                    break;
                case SessionBehavior.END:
                    response.shouldEndSession = true;
                    break;
                case SessionBehavior.IDLE:
                    response.shouldEndSession = undefined;
                    break;
                default:
                    throw new Error(`unknown SessionBehavior value: ${JSON.stringify(result)}`);
            }
        }

        return response;
    }

    // public for testing
    public getSerializableControlStates(): { [key: string]: any } {
        return _extractStateFromControlTree(this.rootControl!);
    }
}

/**
 * Visits each controls and collates the state objects.
 *
 * @param rootControl - Root control
 */
//Exported for internal use only.
export function _extractStateFromControlTree(rootControl: IControl): { [key: string]: any } {
    const stateObj: any = {};
    extractStateCore(rootControl, stateObj);
    return stateObj;
}

function extractStateCore(control: IControl, state: any) {
    if (_.has(state, control.id)) {
        throw new Error(`Duplicate control id: ${control.id}`);
    }
    state[control.id] = control.getSerializableState();

    if (isContainerControl(control)) {
        for (const child of control.children) {
            extractStateCore(child, state);
        }
    }
}
