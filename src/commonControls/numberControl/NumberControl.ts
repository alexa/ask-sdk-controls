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

import { getSupportedInterfaces } from 'ask-sdk-core';
import { Intent, IntentRequest, interfaces } from 'ask-sdk-model';
import i18next from 'i18next';
import _ from 'lodash';
import {
    AmazonBuiltInSlotType,
    DeepRequired,
    falseIfGuardFailed,
    InputUtil,
    ModelData,
    okIf,
    unpackValueControlIntent,
    ValueControlIntent,
} from '../..';
import { Strings as $ } from '../../constants/Strings';
import {
    Control,
    ControlInitiativeHandler,
    ControlInputHandler,
    ControlInputHandlingProps,
    ControlProps,
    ControlState,
} from '../../controls/Control';
import { ControlInput } from '../../controls/ControlInput';
import { ControlResultBuilder } from '../../controls/ControlResult';
import { ControlServices, ControlServicesProps } from '../../controls/ControlServices';
import { ILogger } from '../../controls/interfaces/ILogger';
import { InteractionModelContributor } from '../../controls/mixins/InteractionModelContributor';
import {
    evaluateValidationProp,
    StateValidationFunction,
    ValidationFailure,
} from '../../controls/Validation';
import { GeneralControlIntent, unpackGeneralControlIntent } from '../../intents/GeneralControlIntent';
import { ControlInteractionModelGenerator } from '../../interactionModelGeneration/ControlInteractionModelGenerator';
import { APLMode } from '../../responseGeneration/AplMode';
import { ControlResponseBuilder } from '../../responseGeneration/ControlResponseBuilder';
import {
    InvalidValueAct,
    ValueChangedAct,
    ValueClearedAct,
    ValueConfirmedAct,
    ValueDisconfirmedAct,
    ValueSetAct,
} from '../../systemActs/ContentActs';
import {
    ConfirmValueAct,
    InitiativeAct,
    RequestValueAct,
    SuggestValueAct,
} from '../../systemActs/InitiativeActs';
import { SystemAct } from '../../systemActs/SystemAct';
import { StringOrList } from '../../utils/BasicTypes';
import { evaluateInputHandlers } from '../../utils/ControlUtils';
import { NumberControlAPLComponentBuiltIns, NumberControlAPLPropsBuiltIns } from './NumberControlAPL';
import { NumberControlBuiltIns } from './NumberControlBuiltIns';

const MODULE_NAME = 'AskSdkControls:NumberControl';
/**
 * Props for a NumberControl.
 */
export interface NumberControlProps extends ControlProps {
    /**
     * Unique identifier for control instance
     */
    id: string;

    /**
     * Function(s) that determine if the value is valid.
     *
     * Default: `true`, i.e. any value is valid.
     *
     * Usage:
     * - Validation functions return either `true` or a `ValidationResult` to
     *   describe what validation failed.
     */
    validation?:
        | StateValidationFunction<NumberControlState>
        | Array<StateValidationFunction<NumberControlState>>;

    /**
     * Determines if the Control must obtain a value.
     *
     * - If `true` the Control will take initiative to elicit a value.
     * - If `false` the Control will not take initiative to elicit a value, but the user
     *   can provide one if they wish, e.g. "U: I would three of those".
     */
    required?: boolean | ((input: ControlInput) => boolean);

    /**
     * Props to customize the prompt fragments that will be added by `this.renderAct()`.
     */
    prompts?: NumberControlPromptsProps;

    /**
     * Props to customize the reprompt fragments that will be added by `this.renderAct()`.
     */
    reprompts?: NumberControlPromptsProps;

    /**
     * Whether the Control has to obtain explicit confirmation of the value.
     *
     * If `true`:
     *  - the Control will take initiative to explicitly confirm the value with a yes/no
     *    question.
     *
     * Default: false
     *
     * Usage:
     *
     * 1) Use pre-defined built-ins under NumberControlBuiltIns.* namespace which provides few
     * default implementations.
     *
     * e.g: NumberControlBuiltIns.confirmMostLikelyMisunderstandingInputs returns `true` whenever
     * an input has a most-likely misunderstanding value defined on the function
     * NumberControlBuiltIns.defaultMostLikelyMisunderstandingFunc.
     */
    confirmationRequired?: boolean | ((state: NumberControlState, input: ControlInput) => boolean);

    /**
     * Function that returns the single most likely misunderstanding for a given value, or undefined if none is known.
     *
     * Default:  `NumberControlBuiltIns.defaultMostLikelyMisunderstandingFunc(value)`
     *
     * Control behavior:
     *   - If the user disaffirms a value the most likely misunderstood value is suggested to the user.
     * e.g:
     *
     *   A: What number?
     *   U: Fourteen
     *   A: Was the fourteen?
     *   U: No
     *   A: My mistake. Did you perhaps say forty?
     *   U: Yes
     *   A: Great. 40.
     */
    mostLikelyMisunderstanding?: (value: number, input: ControlInput) => number | undefined;

    /**
     * Props to customize the relationship between the control and the
     * interaction model.
     */
    interactionModel?: NumberControlInteractionModelProps;

    /**
     * Props to configure input handling.
     */
    inputHandling?: ControlInputHandlingProps;

    /**
     * Props to customize the APL generated by this control.
     */
    apl?: NumberControlAPLProps;

    /**
     * Function that maps the NumberControlState.value to rendered value that
     * will be presented to the user as a list.
     *
     * Default: returns the value unchanged in string format.
     */
    valueRenderer?: (value: number, input: ControlInput) => string;

    /**
     * Props to customize services used by the control.
     */
    services?: ControlServicesProps;
}

/**
 * Mapping of action slot values to the capability that this control supports.
 *
 * Behavior:
 * - This control will not handle an input if the action-slot is filled with an
 *   value whose ID is not associated with a capability.
 */
export type NumberControlActionProps = {
    /**
     * Action slot value IDs that are associated with the "set value" capability.
     *
     * Default: ['builtin_set']
     */
    set?: string[];

    /**
     * Action slot value IDs that are associated with the "change value" capability.
     *
     * Default ['builtin_change']
     */
    change?: string[];

    /**
     * Action slot value IDs that are associated with the "clear value" capability.
     *
     * Default ['builtin_clear', builtin_remove']
     */
    clear?: string[];
};

/**
 * Props associated with the interaction model.
 */
export interface NumberControlInteractionModelProps {
    /**
     * Target-slot values associated with this Control.
     *
     * Targets associate utterances to a control. For example, if the user says
     * "change the time", it is parsed as a `GeneralControlIntent` with slot
     * values `action = change` and `target = time`.  Only controls that are
     * registered with the `time` target should offer to handle this intent.
     *
     * Default: ['builtin_it']
     *
     * Usage:
     * - If this prop is defined, it replaces the default; it is not additive to
     *   the defaults.  To add an additional target to the defaults, copy the
     *   defaults and amend.
     * - A control can be associated with many target-slot-values, eg ['date',
     *   'startDate', 'eventStartDate', 'vacationStart']
     * - It is a good idea to associate with general targets (e.g. date) and
     *   also with specific targets (e.g. vacationStart) so that the user can
     *   say either general or specific things.  e.g. 'change the date to
     *   Tuesday', or 'I want my vacation to start on Tuesday'.
     * - The association does not have to be exclusive, and general target slot
     *   values will often be associated with many controls. In situations where
     *   there is ambiguity about what the user is referring to, the parent
     *   controls must resolve the confusion.
     * - The 'builtin_*' IDs are associated with default interaction model data
     *   (which can be extended as desired). Any other IDs will require a full
     *   definition of the allowed synonyms in the interaction model.
     *
     * Control behavior:
     * - A control will not handle an input that mentions a target that is not
     *   registered by this prop.
     *
     */
    targets?: string[];

    /**
     * Action slot-values associated to the control's capabilities.
     *
     * Action slot-values associate utterances to a control. For example, if the
     * user says "change the time", it is parsed as a `GeneralControlIntent`
     * with slot values `action = change` and `target = time`.  Only controls
     * that are registered with the `change` action should offer to handle this
     * intent.
     *
     * Usage:
     *  - This allows users to refer to an action using more domain-appropriate
     *    words. For example, a user might like to say 'show two items' rather
     *    that 'set item count to two'.  To achieve this, include the
     *    slot-value-id 'show' in the list associated with the 'set' capability
     *    and ensure the interaction-model includes an action slot value with
     *    id=show and appropriate synonyms.
     *  - The 'builtin_*' IDs are associated with default interaction model data
     *    (which can be extended as desired). Any other IDs will require a full
     *    definition of the allowed synonyms in the interaction model.
     */
    actions?: NumberControlActionProps;
}

/**
 * Props to customize the prompt fragments that will be added by `this.renderAct()`.
 */
export interface NumberControlPromptsProps {
    requestValue?: StringOrList | ((act: RequestValueAct, input: ControlInput) => StringOrList);
    valueSet?: StringOrList | ((act: ValueSetAct<number>, input: ControlInput) => StringOrList);
    valueChanged?: StringOrList | ((act: ValueChangedAct<number>, input: ControlInput) => StringOrList);
    confirmValue?: StringOrList | ((act: ConfirmValueAct<number>, input: ControlInput) => StringOrList);
    valueConfirmed?: StringOrList | ((act: ValueConfirmedAct<number>, input: ControlInput) => StringOrList);
    valueDisconfirmed?:
        | StringOrList
        | ((act: ValueDisconfirmedAct<number>, input: ControlInput) => StringOrList);
    valueCleared?: StringOrList | ((act: ValueClearedAct<number>, input: ControlInput) => StringOrList);
    invalidValue?: StringOrList | ((act: InvalidValueAct<number>, input: ControlInput) => StringOrList);
    suggestValue?: StringOrList | ((act: SuggestValueAct<number>, input: ControlInput) => StringOrList);
}

export type AplContent = { document: { [key: string]: any }; dataSource: { [key: string]: any } };
export type AplContentFunc = (
    control: NumberControl,
    input: ControlInput,
) => AplContent | Promise<AplContent>;
export type AplDocumentPropNewStyle = AplContent | AplContentFunc;
export type NumberControlAplRenderComponentFunc = (
    control: NumberControl,
    props: NumberControlAPLComponentProps,
    input: ControlInput,
    resultBuilder: ControlResponseBuilder,
) => { [key: string]: any };

/**
 * Props associated with the APL produced by NumberControl.
 */
export class NumberControlAPLProps {
    /**
     * Determines if APL should be produced.
     *
     * Default: true
     */
    enabled?: boolean | ((input: ControlInput) => boolean);

    /**
     * Defines the APL to use when requesting a value.
     */
    requestValue?: AplDocumentPropNewStyle;

    /**
     * Tracks the text to be displayed for invalid input values.
     */
    validationFailedMessage?: string | ((value?: number) => string);

    /**
     * Determines the APL Component rendering mode.
     *
     * Usage:
     *
     * 1) Use pre-defined built-ins under ListControlComponentAPLBuiltIns.* namespace which provides both default
     * implementations and customization of props(NumberControlAPLComponentProps) to render an APL component.
     *
     * e.g  renderComponent: NumberControlAPLComponentBuiltIns.ModalKeyPadRender.default --- Default Implementation
     *      renderComponent: NumberControlAPLComponentBuiltIns.ModalKeyPadRender.default.of(props: NumberControlAPLComponentProps) --- Override few properties
     *
     * 2) Provide a custom function which returns an APL component.
     *
     * Default: NumberControlAPLComponentBuiltIns.ModalKeyPadRender.default
     */
    renderComponent?: NumberControlAplRenderComponentFunc;
}

/**
 * Tracks the last act initiated from the control.
 */
interface LastInitiativeState {
    /**
     * Control act name.
     */
    actName?: string;
}

/**
 * Props to customize NumberControl APLComponent rendering.
 */
export interface NumberControlAPLComponentProps {
    /**
     * Tracks the text to be displayed for invalid input values
     * when control renders APL in Component Mode.
     */
    validationFailedMessage?: string | ((value?: number) => string);

    /**
     * Function that maps the NumberControlState.value to rendered value that
     * will be presented to the user.
     *
     * Default: returns the value unchanged
     */
    valueRenderer?: (value: number, input: ControlInput) => string;
}

/**
 * State tracked by a NumberControl.
 */
export class NumberControlState implements ControlState {
    /**
     * The value, an integer.
     */
    value: number;

    /**
     * Tracks whether the value has been explicitly confirmed by the user.
     */
    confirmed?: boolean;

    /**
     * Tracks the last initiative act from the control
     */
    lastInitiative: LastInitiativeState;

    /**
     * Tracks the most recent elicitation action.
     *
     * Note: this isn't cleared immediate after user provides a value as the
     * value maybe be invalid and has to be re-elicited.  Use
     * state.lastInitiative to test if the most recent turn was a direct elicitation.
     */
    elicitationAction?: string;
}

const FEEDBACK_TYPES = [$.Feedback.Affirm, $.Feedback.Disaffirm];

/**
 * A Control that obtains a single integer from the user.
 *
 * Capabilities:
 * - Request a value
 * - Change a value
 * - Validate the value
 * - Confirm the value
 * - Suggest a value, if the user disconfirms and we know a good alternative to suggest.
 *
 * Intents that can be handled:
 * - `GeneralControlIntent`: E.g. `"yes, update my age"`
 * - `AMAZON_NUMBER_ValueControlIntent`: E.g. "no change it to three".
 * - `AMAZON.YesIntent`, `AMAZON.NoIntent`
 *
 * APL events that can be handled:
 * - touch events indicating number value input.
 */
export class NumberControl extends Control implements InteractionModelContributor {
    state: NumberControlState = new NumberControlState();

    private rawProps: NumberControlProps;
    private props: DeepRequired<NumberControlProps>;
    private handleFunc?: (input: ControlInput, resultBuilder: ControlResultBuilder) => void | Promise<void>;
    private initiativeFunc?: (
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ) => void | Promise<void>;
    private log: ILogger;

    constructor(props: NumberControlProps) {
        super(props.id);
        this.rawProps = props;
        this.props = NumberControl.mergeWithDefaultProps(props);
        this.state.lastInitiative = {};
        this.log = this.props.services.logger.getLogger(MODULE_NAME);
    }

    /**
     * Merges the user-provided props with the default props.
     *
     * Any property defined by the user-provided data overrides the defaults.
     */
    static mergeWithDefaultProps(props: NumberControlProps): DeepRequired<NumberControlProps> {
        const defaults: DeepRequired<NumberControlProps> = {
            id: 'placeholder',
            interactionModel: {
                actions: {
                    set: [$.Action.Set],
                    change: [$.Action.Change],
                    clear: [$.Action.Clear, $.Action.Remove],
                },
                targets: [$.Target.Number, $.Target.It],
            },
            prompts: {
                requestValue: i18next.t('NUMBER_CONTROL_DEFAULT_PROMPT_REQUEST_VALUE'),
                valueChanged: (act) =>
                    i18next.t('NUMBER_CONTROL_DEFAULT_PROMPT_VALUE_CHANGED', {
                        value: act.payload.renderedValue,
                    }),
                confirmValue: (act) =>
                    i18next.t('NUMBER_CONTROL_DEFAULT_PROMPT_CONFIRM_VALUE', {
                        value: act.payload.renderedValue,
                    }),
                valueConfirmed: i18next.t('NUMBER_CONTROL_DEFAULT_PROMPT_VALUE_CONFIRMED'),
                valueDisconfirmed: i18next.t('NUMBER_CONTROL_DEFAULT_PROMPT_VALUE_DISAFFIRMED'),
                valueSet: (act) =>
                    i18next.t('NUMBER_CONTROL_DEFAULT_PROMPT_VALUE_SET', {
                        value: act.payload.renderedValue,
                    }),
                valueCleared: i18next.t('NUMBER_CONTROL_DEFAULT_PROMPT_VALUE_CLEARED'),
                invalidValue: (act) => {
                    if (act.payload.renderedReason !== undefined) {
                        return i18next.t('NUMBER_CONTROL_DEFAULT_PROMPT_INVALID_VALUE_WITH_REASON', {
                            value: act.payload.renderedValue,
                            reason: act.payload.renderedReason,
                        });
                    }
                    return i18next.t('NUMBER_CONTROL_DEFAULT_PROMPT_GENERAL_INVALID_VALUE', {
                        value: act.payload.renderedValue,
                    });
                },
                suggestValue: (act) =>
                    i18next.t('NUMBER_CONTROL_DEFAULT_PROMPT_SUGGEST_VALUE', {
                        value: act.payload.renderedValue,
                    }),
            },
            reprompts: {
                requestValue: i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_REQUEST_VALUE'),
                valueChanged: (act) =>
                    i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_VALUE_CHANGED', {
                        value: act.payload.renderedValue,
                    }),
                confirmValue: (act) =>
                    i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_CONFIRM_VALUE', {
                        value: act.payload.renderedValue,
                    }),
                valueDisconfirmed: i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_VALUE_DISAFFIRMED'),
                valueSet: (act) =>
                    i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_VALUE_SET', {
                        value: act.payload.renderedValue,
                    }),
                valueConfirmed: i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_VALUE_CONFIRMED'),
                valueCleared: (act) =>
                    i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_VALUE_CLEARED', {
                        value: act.payload.renderedValue,
                    }),
                invalidValue: (act) => {
                    if (act.payload.renderedReason !== undefined) {
                        return i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_INVALID_VALUE_WITH_REASON', {
                            value: act.payload.renderedValue,
                            reason: act.payload.renderedReason,
                        });
                    }
                    return i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_GENERAL_INVALID_VALUE', {
                        value: act.payload.renderedValue,
                    });
                },
                suggestValue: (act) =>
                    i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_SUGGEST_VALUE', {
                        value: act.payload.renderedValue,
                    }),
            },
            validation: [],
            confirmationRequired: false,
            required: true,
            apl: {
                enabled: true,
                validationFailedMessage: NumberControlBuiltIns.defaultValidationFailureText(),
                requestValue: NumberControlAPLPropsBuiltIns.defaultSelectValueAPLContent({
                    validationFailedMessage: props.apl?.validationFailedMessage,
                }),
                renderComponent: NumberControlAPLComponentBuiltIns.ModalKeyPadRender.default,
            },
            inputHandling: {
                customHandlingFuncs: [],
            },
            mostLikelyMisunderstanding: NumberControlBuiltIns.defaultMostLikelyMisunderstandingFunc,
            valueRenderer: (value: number, input) => value.toString(),
            services: props.services ?? ControlServices.getDefaults(),
        };
        return _.merge(defaults, props);
    }

    standardInputHandlers: ControlInputHandler[] = [
        {
            name: 'SetWithValue (built-in)',
            canHandle: this.isSetWithValue,
            handle: this.handleSetWithValue,
        },
        {
            name: 'SetWithoutValue (built-in)',
            canHandle: this.isSetWithoutValue,
            handle: this.handleSetWithoutValue,
        },
        {
            name: 'ChangeWithValue (built-in)',
            canHandle: this.isChangeWithValue,
            handle: this.handleChangeWithValue,
        },
        {
            name: 'ChangeWithoutValue (built-in)',
            canHandle: this.isChangeWithoutValue,
            handle: this.handleChangeWithoutValue,
        },
        {
            name: 'BareValue (built-in)',
            canHandle: this.isBareValue,
            handle: this.handleBareValue,
        },
        {
            name: 'ConfirmationAffirmed (built-in)',
            canHandle: this.isConfirmationAffirmed,
            handle: this.handleConfirmationAffirmed,
        },
        {
            name: 'ConfirmationDisaffirmed (built-in)',
            canHandle: this.isConfirmationDisaffirmed,
            handle: this.handleConfirmationDisaffirmed,
        },
        {
            name: 'isAffirmWithValue (built-in)',
            canHandle: this.isAffirmWithValue,
            handle: this.handleAffirmWithValue,
        },
        {
            name: 'isDisaffirmWithValue (built-in)',
            canHandle: this.isDisaffirmWithValue,
            handle: this.handleDisaffirmWithValue,
        },
        {
            name: 'ClearValue (builtin)',
            canHandle: this.isClearValue,
            handle: this.handleClearValue,
        },
        {
            name: 'SelectChoiceByTouch (built-in)',
            canHandle: this.isSelectChoiceByTouch,
            handle: this.handleSelectChoiceByTouch,
        },
        {
            name: 'SuggestionAccepted (built-in)',
            canHandle: this.isSuggestionAccepted,
            handle: this.handleSuggestionAccepted,
        },
    ];

    // tsDoc - see Control
    async canHandle(input: ControlInput): Promise<boolean> {
        return evaluateInputHandlers(this, input);
    }

    // tsDoc - see Control
    async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        this.log.debug(`NumberControl[${this.id}]: handle(). Entering`);

        const intent: Intent = (input.request as IntentRequest).intent;
        if (this.handleFunc === undefined) {
            throw new Error(`${intent.name} can not be handled by ${this.constructor.name}.`);
        }

        await this.handleFunc(input, resultBuilder);

        if (!resultBuilder.hasInitiativeAct() && (await this.canTakeInitiative(input))) {
            return this.takeInitiative(input, resultBuilder);
        }
    }

    /**
     * Determine if the input is an implicit or explicit "set" with a value provided.
     *
     * Example utterance: "Set my age to six"
     *
     * @param input - Input
     */
    private isSetWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isValueControlIntent(input, AmazonBuiltInSlotType.NUMBER));
            const { action, target, feedback, values } = unpackValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            const valueStr = values[0].slotValue;
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueStrDefined(valueStr));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, FEEDBACK_TYPES));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.set));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    /**
     * Handle an implicit or explicit "set" with a value provided.
     *
     * @param input - Input
     * @param resultBuilder - ResultBuilder
     */
    private async handleSetWithValue(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        const { valueStr } = InputUtil.getValueResolution(input);
        this.setValue(valueStr);

        if (this.isConfirmationRequired(input) === true) {
            this.addInitiativeAct(
                new ConfirmValueAct(this, {
                    value: this.state.value,
                    renderedValue: this.props.valueRenderer(this.state.value, input),
                }),
                resultBuilder,
            );
        } else {
            await this.validateAndAddCommonFeedbackActs(input, resultBuilder, $.Action.Set);
        }
        return;
    }

    private isSetWithoutValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, GeneralControlIntent.name));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, FEEDBACK_TYPES));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.set));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleSetWithoutValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.askElicitationQuestion(input, resultBuilder, $.Action.Set);
        return;
    }

    private isChangeWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isValueControlIntent(input, AmazonBuiltInSlotType.NUMBER));
            const { feedback, action, target, values, valueType } = unpackValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            const valueStr = values[0].slotValue;
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueStrDefined(valueStr));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, FEEDBACK_TYPES));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.change));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private async handleChangeWithValue(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        const { valueStr } = InputUtil.getValueResolution(input);
        this.setValue(valueStr);
        if (this.isConfirmationRequired(input) === true) {
            this.addInitiativeAct(
                new ConfirmValueAct(this, {
                    value: this.state.value,
                    renderedValue: this.props.valueRenderer(this.state.value, input),
                }),
                resultBuilder,
            );
        } else {
            await this.validateAndAddCommonFeedbackActs(input, resultBuilder, $.Action.Change);
        }
        return;
    }

    private isChangeWithoutValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, GeneralControlIntent.name));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, FEEDBACK_TYPES));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.change));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleChangeWithoutValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.askElicitationQuestion(input, resultBuilder, $.Action.Change);
        return;
    }

    private isBareValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isValueControlIntent(input, AmazonBuiltInSlotType.NUMBER));
            const { feedback, action, target, values } = unpackValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            const valueStr = values[0].slotValue;
            okIf(InputUtil.feedbackIsUndefined(feedback));
            okIf(InputUtil.actionIsUndefined(action));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueStrDefined(valueStr));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private async handleBareValue(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        const { valueStr } = InputUtil.getValueResolution(input);
        this.setValue(valueStr);
        if (this.isConfirmationRequired(input) === true) {
            this.addInitiativeAct(
                new ConfirmValueAct(this, {
                    value: this.state.value,
                    renderedValue: this.props.valueRenderer(this.state.value, input),
                }),
                resultBuilder,
            );
        } else {
            await this.validateAndAddCommonFeedbackActs(
                input,
                resultBuilder,
                this.state.elicitationAction ?? $.Action.Set,
            );
        }
        return;
    }

    private isConfirmationAffirmed(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isBareYes(input));
            okIf(this.state.lastInitiative.actName === ConfirmValueAct.name);
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private async handleConfirmationAffirmed(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        const validationResult: true | ValidationFailure = await evaluateValidationProp(
            this.props.validation,
            this.state,
            input,
        );
        if (validationResult === true) {
            this.state.confirmed = true;
            this.state.lastInitiative.actName = undefined;
            resultBuilder.addAct(
                new ValueConfirmedAct(this, {
                    value: this.state.value,
                    renderedValue: this.props.valueRenderer(this.state.value, input),
                }),
            );
        } else {
            resultBuilder.addAct(
                new InvalidValueAct<number>(this, {
                    value: this.state.value,
                    renderedValue: this.props.valueRenderer(this.state.value!, input),
                    reasonCode: validationResult.reasonCode,
                    renderedReason: validationResult.renderedReason,
                }),
            );
            this.askElicitationQuestion(input, resultBuilder, $.Action.Set);
        }
    }

    private isSuggestionAccepted(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isBareYes(input));
            okIf(this.state.lastInitiative.actName === SuggestValueAct.name);
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private async handleSuggestionAccepted(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        const validationResult: true | ValidationFailure = await evaluateValidationProp(
            this.props.validation,
            this.state,
            input,
        );
        if (validationResult === true) {
            this.state.confirmed = true;
            this.state.lastInitiative.actName = undefined;
            resultBuilder.addAct(
                new ValueConfirmedAct(this, {
                    value: this.state.value,
                    renderedValue: this.props.valueRenderer(this.state.value, input),
                }),
            );
        } else {
            resultBuilder.addAct(
                new InvalidValueAct<number>(this, {
                    value: this.state.value,
                    renderedValue: this.props.valueRenderer(this.state.value!, input),
                    reasonCode: validationResult.reasonCode,
                    renderedReason: validationResult.renderedReason,
                }),
            );
            this.askElicitationQuestion(input, resultBuilder, $.Action.Set);
        }
    }
    private isConfirmationDisaffirmed(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isBareNo(input));
            okIf(
                this.state.lastInitiative.actName === ConfirmValueAct.name ||
                    this.state.lastInitiative.actName === SuggestValueAct.name,
            );
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleConfirmationDisaffirmed(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        resultBuilder.addAct(
            new ValueDisconfirmedAct(this, {
                value: this.state.value,
                renderedValue: this.props.valueRenderer(this.state.value, input),
            }),
        );
        const suggestValue = this.getSuggestionForMisunderstoodValue(this.state.value, input);
        if (
            suggestValue !== undefined &&
            suggestValue !== this.state.value &&
            this.state.lastInitiative.actName !== SuggestValueAct.name
        ) {
            this.setValue(suggestValue);
            this.addInitiativeAct(
                new SuggestValueAct(this, {
                    value: suggestValue,
                    renderedValue: this.props.valueRenderer(suggestValue!, input),
                }),
                resultBuilder,
            );
        } else {
            // Discard the stored input
            this.clear();
            this.addInitiativeAct(new RequestValueAct(this), resultBuilder);
        }
    }

    private isAffirmWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isValueControlIntent(input, AmazonBuiltInSlotType.NUMBER));
            const { feedback, action, target, values } = unpackValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            const valueStr = values[0].slotValue;
            okIf(InputUtil.feedbackIsMatch(feedback, [$.Feedback.Affirm]));
            okIf(InputUtil.actionIsUndefined(action));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueStrDefined(valueStr));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleAffirmWithValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const { valueStr } = InputUtil.getValueResolution(input);
        const suggestValue = Number.parseInt(valueStr, 10);
        if (suggestValue !== this.state.value) {
            this.setValue(suggestValue);
            this.addInitiativeAct(
                new ConfirmValueAct(this, {
                    value: suggestValue,
                    renderedValue: this.props.valueRenderer(suggestValue!, input),
                }),
                resultBuilder,
            );
        } else {
            this.state.confirmed = true;
            this.state.lastInitiative.actName = undefined;
            resultBuilder.addAct(
                new ValueConfirmedAct(this, {
                    value: this.state.value,
                    renderedValue: this.props.valueRenderer(this.state.value, input),
                }),
            );
        }
    }

    private isDisaffirmWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isValueControlIntent(input, AmazonBuiltInSlotType.NUMBER));
            const { feedback, action, target, values } = unpackValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            const valueStr = values[0].slotValue;
            okIf(InputUtil.feedbackIsMatch(feedback, [$.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsUndefined(action));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueStrDefined(valueStr));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleDisaffirmWithValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        resultBuilder.addAct(
            new ValueDisconfirmedAct(this, {
                value: this.state.value,
                renderedValue: this.props.valueRenderer(this.state.value, input),
            }),
        );
        const { valueStr } = InputUtil.getValueResolution(input);
        const suggestValue = Number.parseInt(valueStr, 10);
        if (suggestValue !== this.state.value) {
            this.setValue(suggestValue);
            this.addInitiativeAct(
                new ConfirmValueAct(this, {
                    value: suggestValue,
                    renderedValue: this.props.valueRenderer(suggestValue!, input),
                }),
                resultBuilder,
            );
        } else {
            // Discard the stored input
            this.clear();
            this.addInitiativeAct(new RequestValueAct(this), resultBuilder);
        }
    }

    private isClearValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, GeneralControlIntent.name));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, FEEDBACK_TYPES));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.clear));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleClearValue(input: ControlInput, resultBuilder: ControlResultBuilder) {
        resultBuilder.addAct(
            new ValueClearedAct(this, {
                value: this.state.value,
                renderedValue: this.props.valueRenderer(this.state.value, input),
            }),
        );
        this.clear();
        return;
    }

    private isSelectChoiceByTouch(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isAPLUserEventWithMatchingControlId(input, this.id));
            const userEvent = input.request as interfaces.alexa.presentation.apl.UserEvent;
            okIf(userEvent.arguments !== undefined);
            okIf(userEvent.arguments.length === 2);
            const controlId = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![0] as string;
            okIf(controlId === this.id);
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private async handleSelectChoiceByTouch(input: ControlInput, resultBuilder: ControlResultBuilder) {
        const valueStr = (input.request as interfaces.alexa.presentation.apl.UserEvent)
            .arguments![1] as string;
        this.setValue(valueStr);
        this.state.confirmed = true;
        await this.validateAndAddCommonFeedbackActs(input, resultBuilder, $.Action.Set);
        return;
    }

    async validateAndAddCommonFeedbackActs(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
        elicitationAction: string,
    ): Promise<void> {
        const validationResult: true | ValidationFailure = await evaluateValidationProp(
            this.props.validation,
            this.state,
            input,
        );
        if (validationResult === true) {
            if (elicitationAction === $.Action.Set) {
                resultBuilder.addAct(
                    new ValueSetAct(this, {
                        value: this.state.value,
                        renderedValue: this.props.valueRenderer(this.state.value, input),
                    }),
                );
            } else if (elicitationAction === $.Action.Change) {
                resultBuilder.addAct(
                    new ValueChangedAct(this, {
                        value: this.state.value,
                        renderedValue: this.props.valueRenderer(this.state.value, input),
                    }),
                );
            } else {
                throw new Error('Invalid elicitation Action');
            }
        } else {
            this.state.confirmed = false;
            resultBuilder.addAct(
                new InvalidValueAct<number>(this, {
                    value: this.state.value,
                    renderedValue: this.props.valueRenderer(this.state.value!, input),
                    reasonCode: validationResult.reasonCode,
                    renderedReason: validationResult.renderedReason,
                }),
            );
            this.askElicitationQuestion(input, resultBuilder, elicitationAction);
        }
    }

    private askElicitationQuestion(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
        elicitationAction: string,
    ) {
        this.state.elicitationAction = elicitationAction;
        this.addInitiativeAct(new RequestValueAct(this), resultBuilder);
    }

    addInitiativeAct(initiativeAct: InitiativeAct, resultBuilder: ControlResultBuilder) {
        this.state.lastInitiative.actName = initiativeAct.constructor.name;
        resultBuilder.addAct(initiativeAct);
    }

    isConfirmationRequired(input: ControlInput): boolean {
        if (this.state.value === undefined) {
            return false;
        }

        if (this.state.confirmed === true) {
            return false;
        }
        const propValue = this.props.confirmationRequired;
        return typeof propValue === 'function' ? propValue.call(this, this.state, input) : propValue;
    }

    private confirmValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.addInitiativeAct(
            new ConfirmValueAct(this, {
                value: this.state.value,
                renderedValue:
                    this.state.value !== undefined ? this.props.valueRenderer(this.state.value, input) : '',
            }),
            resultBuilder,
        );
    }

    standardInitiativeHandlers: ControlInitiativeHandler[] = [
        {
            name: 'ElicitValue (built-in)',
            canTakeInitiative: this.wantsToElicitValue,
            takeInitiative: this.elicitValue,
        },
        {
            name: 'RequestReplacementForInvalidValue (built-in)',
            canTakeInitiative: this.wantsToRequestReplacementForInvalidValue,
            takeInitiative: this.requestReplacementForInvalidValue,
        },
        {
            name: 'ConfirmValue (built-in)',
            canTakeInitiative: this.wantsToConfirmValue,
            takeInitiative: this.confirmValue,
        },
    ];

    // tsDoc - see Control
    async canTakeInitiative(input: ControlInput): Promise<boolean> {
        const stdHandlers = this.standardInitiativeHandlers;

        const matches = [];
        for (const handler of stdHandlers) {
            if (await handler.canTakeInitiative.call(this, input)) {
                matches.push(handler);
            }
        }

        if (matches.length > 1) {
            this.log.error(
                `More than one handler matched. Initiative Handlers in a single control should be mutually exclusive. ` +
                    `Defaulting to the first. Initiative handlers: ${JSON.stringify(
                        matches.map((x) => x.name),
                    )}`,
            );
        }

        if (matches.length >= 1) {
            this.initiativeFunc = matches[0].takeInitiative.bind(this);
            return true;
        } else {
            return false;
        }
    }

    // tsDoc - see Control
    async takeInitiative(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        if (this.initiativeFunc === undefined) {
            const errorMsg =
                'NumberControl: takeInitiative called but this.initiativeFunc is not set. canTakeInitiative() should be called first to set this.initiativeFunc.';
            this.log.error(errorMsg);
            throw new Error(errorMsg);
        }
        await this.initiativeFunc(input, resultBuilder);
        return;
    }

    private wantsToElicitValue(input: ControlInput): boolean {
        if (this.state.value === undefined && this.evaluateBooleanProp(this.props.required, input)) {
            return true;
        }
        return false;
    }

    private elicitValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.askElicitationQuestion(input, resultBuilder, $.Action.Set);
    }

    private async wantsToRequestReplacementForInvalidValue(input: ControlInput): Promise<boolean> {
        if (
            this.state.value !== undefined &&
            (await evaluateValidationProp(this.props.validation, this.state, input)) !== true
        ) {
            return true;
        }
        return false;
    }

    private async requestReplacementForInvalidValue(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        await this.validateAndAddCommonFeedbackActs(input, resultBuilder, $.Action.Change);
    }

    private wantsToConfirmValue(input: ControlInput): boolean {
        return this.isConfirmationRequired(input);
    }

    // tsDoc - see Control
    async renderAct(act: SystemAct, input: ControlInput, builder: ControlResponseBuilder) {
        if (act instanceof RequestValueAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.requestValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.requestValue, input),
            );
            const slotElicitation = generateSlotElicitation();
            builder.addElicitSlotDirective(slotElicitation.slotName, slotElicitation.intent);

            // Check APL mode to prevent addition of APL Directive.
            if (builder.aplMode === APLMode.DIRECT) {
                await this.addStandardAPL(input, builder); // re-render APL Screen
            }
        } else if (act instanceof ConfirmValueAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.confirmValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.confirmValue, input),
            );

            // Check APL mode to prevent addition of APL Directive.
            if (builder.aplMode === APLMode.DIRECT) {
                await this.addStandardAPL(input, builder); // re-render APL Screen
            }
        } else if (act instanceof ValueDisconfirmedAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.valueDisconfirmed, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueDisconfirmed, input),
            );
        } else if (act instanceof ValueSetAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueSet, input));
            builder.addRepromptFragment(this.evaluatePromptProp(act, this.props.reprompts.valueSet, input));
        } else if (act instanceof ValueChangedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueChanged, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueChanged, input),
            );
        } else if (act instanceof ValueConfirmedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueConfirmed, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueConfirmed, input),
            );
        } else if (act instanceof ValueClearedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueCleared, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueCleared, input),
            );
        } else if (act instanceof InvalidValueAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.invalidValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.invalidValue, input),
            );
        } else if (act instanceof SuggestValueAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.suggestValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.suggestValue, input),
            );
        } else {
            this.throwUnhandledActError(act);
        }
    }

    private async addStandardAPL(input: ControlInput, builder: ControlResponseBuilder) {
        if (
            this.evaluateBooleanProp(this.props.apl.enabled, input) === true &&
            getSupportedInterfaces(input.handlerInput.requestEnvelope)['Alexa.Presentation.APL']
        ) {
            const renderedAPL = await this.evaluateAPLPropNewStyle(this.props.apl.requestValue, input);
            builder.addAPLRenderDocumentDirective(this.id, renderedAPL.document, renderedAPL.dataSource);
        }
    }

    // tsDoc - see Control
    updateInteractionModel(generator: ControlInteractionModelGenerator, imData: ModelData) {
        generator.addControlIntent(new GeneralControlIntent(), imData);
        generator.addControlIntent(new ValueControlIntent(AmazonBuiltInSlotType.NUMBER), imData);
        generator.addYesAndNoIntents();

        for (const [capability, actionSlotIds] of Object.entries(this.props.interactionModel.actions)) {
            generator.ensureSlotValueIDsAreDefined(this.id, 'action', actionSlotIds);
        }
        generator.ensureSlotValueIDsAreDefined(this.id, 'target', this.props.interactionModel.targets);
    }

    /**
     * Directly set the value.
     *
     * @param value - Value, either an integer or a string that can be parsed as a integer.
     */
    setValue(value: string | number) {
        this.state.value = typeof value === 'string' ? Number.parseInt(value, 10) : value;
    }

    /**
     * Clear the state of this control.
     */
    clear() {
        this.state = new NumberControlState();
        this.state.lastInitiative = {};
    }

    async renderAPLComponent(
        input: ControlInput,
        resultBuilder: ControlResponseBuilder,
    ): Promise<{ [key: string]: any }> {
        const aplRenderFunc = this.props.apl.renderComponent;
        const defaultProps: NumberControlAPLComponentProps = {
            validationFailedMessage: (value?: number) =>
                i18next.t('NUMBER_CONTROL_DEFAULT_APL_INVALID_VALUE', { value }),
            valueRenderer: this.props.valueRenderer,
        };
        return aplRenderFunc.call(this, this, defaultProps, input, resultBuilder);
    }

    private getSuggestionForMisunderstoodValue(value: number, input: ControlInput): number | undefined {
        return this.props.mostLikelyMisunderstanding(value, input);
    }

    private async evaluateAPLPropNewStyle(
        prop: AplDocumentPropNewStyle,
        input: ControlInput,
    ): Promise<AplContent> {
        return typeof prop === 'function' ? (prop as AplContentFunc).call(this, this, input) : prop;
    }

    async evaluateAPLValidationFailedMessage(
        prop: string | ((value?: number) => string),
        input: ControlInput,
    ): Promise<string> {
        if (this.state.value === undefined) {
            return '';
        }

        const validationResult: true | ValidationFailure = await evaluateValidationProp(
            this.props.validation,
            this.state,
            input,
        );
        if (validationResult !== true) {
            if (typeof prop === 'function') {
                return prop(this.state.value);
            }
            return prop;
        }
        return '';
    }
}

/**
 * Creates an elicit-slot directive for the provided slotType.
 *
 * - The intent specified is a `AMAZON_NUMBER_ValueControlIntent`
 * - The slot specified is the `slotType` slot.
 *
 * @param slotType - Slot type
 */
function generateSlotElicitation(): { intent: Intent; slotName: string } {
    const intent: Intent = {
        name: ValueControlIntent.intentName(AmazonBuiltInSlotType.NUMBER),
        slots: {
            'AMAZON.NUMBER': { name: 'AMAZON.NUMBER', value: '', confirmationStatus: 'NONE' },
            feedback: { name: 'feedback', value: '', confirmationStatus: 'NONE' },
            action: { name: 'action', value: '', confirmationStatus: 'NONE' },
            target: { name: 'target', value: '', confirmationStatus: 'NONE' },
            head: { name: 'head', value: '', confirmationStatus: 'NONE' },
            tail: { name: 'tail', value: '', confirmationStatus: 'NONE' },
            preposition: { name: 'preposition', value: '', confirmationStatus: 'NONE' },
        },
        confirmationStatus: 'NONE',
    };

    return {
        intent,
        slotName: AmazonBuiltInSlotType.NUMBER,
    };
}
