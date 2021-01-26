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
import { Intent, IntentRequest } from 'ask-sdk-model';
import i18next from 'i18next';
import _ from 'lodash';
import { Strings as $ } from '../constants/Strings';
import {
    Control,
    ControlInputHandler,
    ControlInputHandlingProps,
    ControlProps,
    ControlState,
} from '../controls/Control';
import { ControlInput } from '../controls/ControlInput';
import { ControlResultBuilder } from '../controls/ControlResult';
import { InteractionModelContributor } from '../controls/mixins/InteractionModelContributor';
import { StateValidationFunction, ValidationFailure } from '../controls/Validation';
import { AmazonBuiltInSlotType } from '../intents/AmazonBuiltInSlotType';
import { GeneralControlIntent, unpackGeneralControlIntent } from '../intents/GeneralControlIntent';
import { ValueControlIntent, unpackValueControlIntent } from '../intents/ValueControlIntent';
import { ControlInteractionModelGenerator } from '../interactionModelGeneration/ControlInteractionModelGenerator';
import { ModelData } from '../interactionModelGeneration/ModelTypes';
import { Logger } from '../logging/Logger';
import { ControlResponseBuilder } from '../responseGeneration/ControlResponseBuilder';
import {
    InvalidValueAct,
    ValueChangedAct,
    ValueConfirmedAct,
    ValueDisconfirmedAct,
    ValueSetAct,
} from '../systemActs/ContentActs';
import { ConfirmValueAct, RequestChangedValueAct, RequestValueAct } from '../systemActs/InitiativeActs';
import { SystemAct } from '../systemActs/SystemAct';
import { StringOrList } from '../utils/BasicTypes';
import { evaluateInputHandlers, _logIfBothTrue } from '../utils/ControlUtils';
import { DeepRequired } from '../utils/DeepRequired';
import { InputUtil } from '../utils/InputUtil';
import { falseIfGuardFailed, okIf } from '../utils/Predicates';
import { getEndDateOfRange, getStartDateOfRange, getUTCDate } from './dateRangeControl/DateHelper';

const log = new Logger('AskSdkControls:DateControl');

/**
 * Props for a DateControl.
 */
export interface DateControlProps extends ControlProps {
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
     *    describe what validation failed.
     *
     * - Common validation functions are defined in the `DateControlValidations` namespace
     *   which can be added directly to this prop. e.g.:
     * ```
     * valid: DateControlValidations.FUTURE_DATE_ONLY,
     * ```
     */
    validation?: StateValidationFunction<DateControlState> | Array<StateValidationFunction<DateControlState>>;

    /**
     * Determines if the Control must obtain a value.
     *
     * - If `true` the Control will take initiative to elicit a value.
     * - If `false` the Control will not take initiative to elicit a value, but the user
     *   can provide one if they wish, e.g. "U: I would like this by Tuesday".
     */
    required?: boolean | ((input: ControlInput) => boolean);

    /**
     * Whether the Control has to obtain explicit confirmation of the value.
     *
     * If `true`:
     *  - the Control will take initiative to explicitly confirm the value with a yes/no
     *    question.
     */
    confirmationRequired?: boolean | ((input: ControlInput) => boolean);

    /**
     * Props to customize the prompt fragments that will be added by
     * `this.renderAct()`.
     */
    prompts?: DateControlPromptProps;

    /**
     * Props to customize the reprompt fragments that will be added by
     * `this.renderAct()`.
     */
    reprompts?: DateControlPromptProps;

    /**
     * Props to customize the relationship between the control and the
     * interaction model.
     */
    interactionModel?: DateControlInteractionModelProps;

    /**
     * Props to configure input handling.
     */
    inputHandling?: ControlInputHandlingProps;

    /**
     * Function that maps the DateControlState.value to a corresponding rendered value that will be presented
     * to the user.
     *
     * Default: returns the value unchanged.
     */
    valueRenderer?: (value: string, input: ControlInput) => string;
}

/**
 * Mapping of action slot values to the capability that this control supports.
 *
 * Behavior:
 * - This control will not handle an input if the action-slot is filled with an
 *   value whose ID is not associated with a capability.
 */
export type DateControlActionProps = {
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
};

/**
 * Props associated with the interaction model.
 */
export interface DateControlInteractionModelProps {
    /**
     * Target-slot values associated with this Control.
     *
     * Targets associate utterances to a control. For example, if the user says
     * "change the time", it is parsed as a `GeneralControlIntent` with slot
     * values `action = change` and `target = time`.  Only controls that are
     * registered with the `time` target should offer to handle this intent.
     *
     * Default: ['builtin_date', 'builtin_it']
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
    actions?: DateControlActionProps;
}

/**
 * Reason codes for built-in validation rules.
 */
export enum DateValidationFailReasonCode {
    /**
     * The date must be in the past.
     */
    PAST_DATE_ONLY = 'pastDateOnly',

    /**
     * The date must be in the future.
     */
    FUTURE_DATE_ONLY = 'futureDateOnly',
}

/**
 * Built-in validation functions for use with DateControl
 */
export namespace DateControlValidations {
    /**
     * Validate that the date is in the past.
     * @param state - Control state
     * @param input - Input
     */
    export const PAST_DATE_ONLY: StateValidationFunction<DateControlState> = (
        state: DateControlState,
        input: ControlInput,
    ): true | ValidationFailure => {
        const startDate = getStartDateOfRange(state.value!);
        const startDateInUTC = getUTCDate(startDate);

        const now = new Date();
        if (startDateInUTC > now) {
            return {
                reasonCode: DateValidationFailReasonCode.PAST_DATE_ONLY,
                renderedReason: i18next.t('DATE_CONTROL_DEFAULT_PROMPT_VALIDATION_FAIL_PAST_DATE_ONLY'),
            };
        }
        return true;
    };

    /**
     * Validate that the date is in the future.
     * @param state - Control state
     * @param input - Input
     */
    export const FUTURE_DATE_ONLY: StateValidationFunction<DateControlState> = (
        state: DateControlState,
        input: ControlInput,
    ): true | ValidationFailure => {
        const endDate = getEndDateOfRange(state.value!);
        const endDateInUTC = getUTCDate(endDate);

        const now = new Date();
        if (endDateInUTC < now) {
            return {
                reasonCode: DateValidationFailReasonCode.FUTURE_DATE_ONLY,
                renderedReason: i18next.t('DATE_CONTROL_DEFAULT_PROMPT_VALIDATION_FAIL_FUTURE_DATE_ONLY'),
            };
        }
        return true;
    };
}

/**
 * Props to customize the prompt fragments that will be added by
 * `this.renderAct()`.
 */
export interface DateControlPromptProps {
    valueSet?: StringOrList | ((act: ValueSetAct<number>, input: ControlInput) => StringOrList);
    valueChanged?: StringOrList | ((act: ValueChangedAct<number>, input: ControlInput) => StringOrList);
    invalidValue?: StringOrList | ((act: InvalidValueAct<number>, input: ControlInput) => StringOrList);
    requestValue?: StringOrList | ((act: RequestValueAct, input: ControlInput) => StringOrList);
    requestChangedValue?: StringOrList | ((act: RequestChangedValueAct, input: ControlInput) => StringOrList);
    confirmValue?: StringOrList | ((act: ConfirmValueAct<number>, input: ControlInput) => StringOrList);
    valueDisaffirmed?:
        | StringOrList
        | ((act: ValueDisconfirmedAct<number>, input: ControlInput) => StringOrList);
    valueAffirmed?: StringOrList | ((act: ValueConfirmedAct<number>, input: ControlInput) => StringOrList);
}

/**
 * State tracked by a DateControl.
 */
export class DateControlState implements ControlState {
    /**
     * The value, an ISO date string.
     */
    value: string;

    /**
     * Tracks if the control is actively asking the user to set or change the value.
     */
    elicitationAction?: string;

    /**
     * Tracks whether the value has been explicitly confirmed by the user.
     */
    isValueConfirmed: boolean = false;

    /**
     * The previous value.
     */
    previousValue?: string;

    /**
     * Tracks the last initiative act from the control
     */
    activeInitiativeAct?: string;
}

/**
 * A Control that obtains a single date from the user.
 *
 * Capabilities:
 * - Request a value
 * - Change a value
 * - Validate the value
 * - Confirm the value
 * - Infer the specific date for a partially specified date.
 *
 * Intents that can be handled:
 * - `GeneralControlIntent`: E.g. `"yes, update my birth date"`
 * - `AMAZON_DATE_ValueControlIntent`: E.g. "no change it to Tuesday".
 * - `AMAZON.YesIntent`, `AMAZON.NoIntent`
 */
export class DateControl extends Control implements InteractionModelContributor {
    state: DateControlState = new DateControlState();

    private rawProps: DateControlProps;
    private props: DeepRequired<DateControlProps>;
    private handleFunc?: (input: ControlInput, resultBuilder: ControlResultBuilder) => void | Promise<void>;
    private initiativeFunc?: (
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ) => void | Promise<void>;

    constructor(props: DateControlProps) {
        super(props.id);
        this.rawProps = props;
        this.props = DateControl.mergeWithDefaultProps(props);
    }

    /**
     * Merges the user-provided props with the default props.
     *
     * Any property defined by the user-provided data overrides the defaults.
     */
    static mergeWithDefaultProps(props: DateControlProps): DeepRequired<DateControlProps> {
        const defaults: DeepRequired<DateControlProps> = {
            id: 'dummy',
            prompts: {
                confirmValue: (act) =>
                    i18next.t('DATE_CONTROL_DEFAULT_PROMPT_CONFIRM_VALUE', {
                        value: act.payload.renderedValue,
                    }),
                valueAffirmed: i18next.t('DATE_CONTROL_DEFAULT_PROMPT_VALUE_AFFIRMED'),
                valueDisaffirmed: i18next.t('DATE_CONTROL_DEFAULT_PROMPT_VALUE_DISAFFIRMED'),
                valueSet: i18next.t('DATE_CONTROL_DEFAULT_PROMPT_VALUE_SET'),
                valueChanged: (act) =>
                    i18next.t('DATE_CONTROL_DEFAULT_PROMPT_VALUE_CHANGED', {
                        old: act.payload.renderedPreviousValue,
                        new: act.payload.renderedValue,
                    }),
                invalidValue: (act) => {
                    if (act.payload.renderedReason !== undefined) {
                        return i18next.t('DATE_CONTROL_DEFAULT_PROMPT_INVALID_VALUE_WITH_REASON', {
                            reason: act.payload.renderedReason,
                        });
                    }
                    return i18next.t('DATE_CONTROL_DEFAULT_PROMPT_GENERAL_INVALID_VALUE');
                },
                requestValue: i18next.t('DATE_CONTROL_DEFAULT_PROMPT_REQUEST_VALUE'),
                requestChangedValue: i18next.t('DATE_CONTROL_DEFAULT_PROMPT_REQUEST_CHANGED_VALUE'),
            },
            reprompts: {
                confirmValue: (act) =>
                    i18next.t('DATE_CONTROL_DEFAULT_REPROMPT_CONFIRM_VALUE', {
                        value: act.payload.renderedValue,
                    }),
                valueAffirmed: i18next.t('DATE_CONTROL_DEFAULT_REPROMPT_VALUE_AFFIRMED'),
                valueDisaffirmed: i18next.t('DATE_CONTROL_DEFAULT_REPROMPT_VALUE_DISAFFIRMED'),
                valueSet: i18next.t('DATE_CONTROL_DEFAULT_REPROMPT_VALUE_SET'),
                valueChanged: (act) =>
                    i18next.t('DATE_CONTROL_DEFAULT_REPROMPT_VALUE_CHANGED', {
                        old: act.payload.renderedPreviousValue,
                        new: act.payload.renderedValue,
                    }),
                invalidValue: (act) => {
                    if (act.payload.renderedReason !== undefined) {
                        return i18next.t('DATE_CONTROL_DEFAULT_REPROMPT_INVALID_VALUE_WITH_REASON', {
                            reason: act.payload.renderedReason,
                        });
                    }
                    return i18next.t('DATE_CONTROL_DEFAULT_REPROMPT_GENERAL_INVALID_VALUE');
                },
                requestValue: i18next.t('DATE_CONTROL_DEFAULT_REPROMPT_REQUEST_VALUE'),
                requestChangedValue: i18next.t('DATE_CONTROL_DEFAULT_REPROMPT_REQUEST_CHANGED_VALUE'),
            },
            interactionModel: {
                actions: {
                    set: [$.Action.Set],
                    change: [$.Action.Change],
                },
                targets: [$.Target.Date, $.Target.It],
            },
            inputHandling: {
                customHandlingFuncs: [],
            },
            valueRenderer: (value: string, input) => value,
            validation: [],
            confirmationRequired: false,
            required: true,
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
            name: 'ChangeWithValue (built-in)',
            canHandle: this.isChangeWithValue,
            handle: this.handleChangeWithValue,
        },
        {
            name: 'SetWithoutValue (built-in)',
            canHandle: this.isSetWithoutValue,
            handle: this.handleSetWithoutValue,
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
    ];
    // tsDoc - see Control
    async canHandle(input: ControlInput): Promise<boolean> {
        return evaluateInputHandlers(this, input);
    }

    private isSetWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isValueControlIntent(input, AmazonBuiltInSlotType.DATE));
            const { feedback, action, target, values } = unpackValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            const valueStr = values[0].slotValue;
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.set));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueStrDefined(valueStr));
            this.handleFunc = this.handleSetWithValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private async handleSetWithValue(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        const { values } = unpackValueControlIntent((input.request as IntentRequest).intent);
        const valueStr = values[0].slotValue;
        this.setValue(valueStr);
        await this.validateAndAddActs(input, resultBuilder, $.Action.Set);
        return;
    }

    private isSetWithoutValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, GeneralControlIntent.name));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.set));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            this.handleFunc = this.handleSetWithoutValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleSetWithoutValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.askElicitationQuestion(input, resultBuilder, $.Action.Set);
        return;
    }

    /**
     * Test if the input is a valid change-action with a value provided.
     *
     * @param input - Input
     */
    private isChangeWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isValueControlIntent(input, AmazonBuiltInSlotType.DATE));
            const { feedback, action, target, values } = unpackValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            const valueStr = values[0].slotValue;
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.change));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueStrDefined(valueStr));
            this.handleFunc = this.handleChangeWithValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private async handleChangeWithValue(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        const { values } = unpackValueControlIntent((input.request as IntentRequest).intent);
        const valueStr = values[0].slotValue;
        this.setValue(valueStr);
        await this.validateAndAddActs(input, resultBuilder, $.Action.Change);
        return;
    }

    /**
     * Test if the input is a valid change-action without a value provided.
     *
     * @param input - Input
     */
    private isChangeWithoutValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, GeneralControlIntent.name));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.change));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            this.handleFunc = this.handleChangeWithoutValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleChangeWithoutValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.askElicitationQuestion(input, resultBuilder, $.Action.Change);
        return;
    }

    /**
     * Test if the input is a DateControlIntent with just a date provided.
     * If we aren't asking a question it is assumed the user meant 'set value'.
     * @param input - Input
     */
    private isBareValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isValueControlIntent(input, AmazonBuiltInSlotType.DATE));
            const { feedback, action, target, values } = unpackValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            const valueStr = values[0].slotValue;
            okIf(InputUtil.feedbackIsUndefined(feedback));
            okIf(InputUtil.actionIsUndefined(action));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueStrDefined(valueStr));
            this.handleFunc = this.handleBareValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private async handleBareValue(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        const { values } = unpackValueControlIntent((input.request as IntentRequest).intent);
        const valueStr = values[0].slotValue;
        this.setValue(valueStr);
        await this.validateAndAddActs(input, resultBuilder, this.state.elicitationAction ?? $.Action.Set);
        return;
    }

    private isConfirmationAffirmed(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isBareYes(input));
            okIf(this.state.activeInitiativeAct === 'ConfirmValueAct');
            this.handleFunc = this.handleConfirmationAffirmed;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleConfirmationAffirmed(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.state.activeInitiativeAct = undefined;
        this.state.isValueConfirmed = true;
        resultBuilder.addAct(
            new ValueConfirmedAct(this, {
                value: this.state.value,
                renderedValue: this.props.valueRenderer(this.state.value!, input),
            }),
        );
    }

    private isConfirmationDisaffirmed(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isBareNo(input));
            okIf(this.state.activeInitiativeAct === 'ConfirmValueAct');
            this.handleFunc = this.handleConfirmationDisaffirmed;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleConfirmationDisaffirmed(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.state.isValueConfirmed = false;
        this.state.activeInitiativeAct = undefined;
        resultBuilder.addAct(
            new ValueDisconfirmedAct(this, {
                value: this.state.value,
                renderedValue: this.props.valueRenderer(this.state.value!, input),
            }),
        );
        resultBuilder.addAct(new RequestValueAct(this));
    }

    // tsDoc - see Control
    async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        log.debug(`DateControl[${this.id}]: handle(). Entering`);

        if (this.handleFunc === undefined) {
            const intent: Intent = (input.request as IntentRequest).intent;
            throw new Error(`${intent.name} can not be handled by ${this.constructor.name}.`);
        }

        await this.handleFunc(input, resultBuilder);
        if (resultBuilder.hasInitiativeAct() !== true && (await this.canTakeInitiative(input)) === true) {
            await this.takeInitiative(input, resultBuilder);
        }
    }

    // tsDoc - see Control
    async canTakeInitiative(input: ControlInput): Promise<boolean> {
        return (
            this.wantsToConfirmValue(input) ||
            (await this.wantsToFixInvalidValue(input)) ||
            this.wantsToElicitValue(input)
        );
    }

    // tsDoc - see Control
    async takeInitiative(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        if (this.initiativeFunc === undefined) {
            const errorMsg =
                'DateControl: takeInitiative called but this.initiativeFunc is not set. canTakeInitiative() should be called first to set this.initiativeFunc.';
            log.error(errorMsg);
            throw new Error(errorMsg);
        }
        await this.initiativeFunc(input, resultBuilder);
        return;
    }

    private wantsToElicitValue(input: ControlInput): boolean {
        if (this.state.value === undefined && this.evaluateBooleanProp(this.props.required, input)) {
            this.initiativeFunc = this.elicitValue;
            return true;
        }
        return false;
    }

    private elicitValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.askElicitationQuestion(input, resultBuilder, $.Action.Set);
    }

    // public-for-testing
    askElicitationQuestion(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
        elicitationAction: string,
    ) {
        this.state.elicitationAction = elicitationAction;
        switch (elicitationAction) {
            case $.Action.Set:
                resultBuilder.addAct(new RequestValueAct(this));
                return;
            case $.Action.Change:
                resultBuilder.addAct(
                    new RequestChangedValueAct(this, {
                        currentValue: this.state.value!,
                        renderedValue: this.props.valueRenderer(this.state.value!, input),
                    }),
                );
                return;
            default:
                throw new Error(`Unhandled. Unknown elicitationAction: ${elicitationAction}`);
        }
    }

    async validateAndAddActs(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
        elicitationAction: string,
    ): Promise<void> {
        this.state.elicitationAction = elicitationAction;
        const validationResult: true | ValidationFailure = await this.validate(input);
        if (validationResult === true) {
            if (elicitationAction === $.Action.Change) {
                // if elicitationAction == 'change', then the previousValue must be defined.
                if (this.state.previousValue !== undefined) {
                    resultBuilder.addAct(
                        new ValueChangedAct<string>(this, {
                            previousValue: this.state.previousValue,
                            renderedPreviousValue: this.props.valueRenderer(this.state.previousValue, input),
                            value: this.state.value!,
                            renderedValue: this.props.valueRenderer(this.state.value!, input),
                        }),
                    );
                } else {
                    throw new Error(
                        'ValueChangedAct should only be used if there is an actual previous value',
                    );
                }
            } else {
                resultBuilder.addAct(
                    new ValueSetAct(this, {
                        value: this.state.value,
                        renderedValue: this.props.valueRenderer(this.state.value!, input),
                    }),
                );
            }
        } else {
            // feedback
            resultBuilder.addAct(
                new InvalidValueAct<string>(this, {
                    value: this.state.value!,
                    renderedValue: this.props.valueRenderer(this.state.value!, input),
                    reasonCode: validationResult.reasonCode,
                    renderedReason: validationResult.renderedReason,
                }),
            );
            this.askElicitationQuestion(input, resultBuilder, elicitationAction);
        }
        return;
    }

    private wantsToConfirmValue(input: ControlInput): boolean {
        if (
            this.state.value !== undefined &&
            this.state.isValueConfirmed === false &&
            this.evaluateBooleanProp(this.props.confirmationRequired, input)
        ) {
            this.initiativeFunc = this.confirmValue;
            return true;
        }
        return false;
    }

    private confirmValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.state.activeInitiativeAct = 'ConfirmValueAct';
        resultBuilder.addAct(
            new ConfirmValueAct(this, {
                value: this.state.value,
                renderedValue: this.props.valueRenderer(this.state.value!, input),
            }),
        );
    }

    private async wantsToFixInvalidValue(input: ControlInput): Promise<boolean> {
        if (this.state.value !== undefined && (await this.validate(input)) !== true) {
            this.initiativeFunc = this.fixInvalidValue;
            return true;
        }
        return false;
    }

    private async fixInvalidValue(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        await this.validateAndAddActs(input, resultBuilder, $.Action.Change);
    }

    private async validate(input: ControlInput): Promise<true | ValidationFailure> {
        const listOfValidationFunc: Array<StateValidationFunction<DateControlState>> =
            typeof this.props.validation === 'function' ? [this.props.validation] : this.props.validation;
        for (const validationFunction of listOfValidationFunc) {
            const validationResult: true | ValidationFailure = await validationFunction(this.state, input);
            if (validationResult !== true) {
                log.debug(
                    `DateControl.validate(): validation failed. Reason: ${JSON.stringify(
                        validationResult,
                        null,
                        2,
                    )}.`,
                );
                return validationResult;
            }
        }
        return true;
    }

    /**
     * Directly set the value.
     *
     * @param value - Value, an ISO Date string
     */
    setValue(value: string) {
        this.state.previousValue = this.state.value;
        this.state.value = value;
        this.state.isValueConfirmed = false;
    }

    /**
     * Clear the state of this control.
     */
    clear() {
        this.state = new DateControlState();
    }

    // tsDoc - see Control
    renderAct(act: SystemAct, input: ControlInput, builder: ControlResponseBuilder): void {
        if (act instanceof RequestValueAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.requestValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.requestValue, input),
            );
            const slotElicitation = generateSlotElicitation();
            builder.addElicitSlotDirective(slotElicitation.slotName, slotElicitation.intent);
        } else if (act instanceof ValueSetAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueSet, input));
            builder.addRepromptFragment(this.evaluatePromptProp(act, this.props.reprompts.valueSet, input));
        } else if (act instanceof ValueChangedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueChanged, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueChanged, input),
            );
        } else if (act instanceof InvalidValueAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.invalidValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.invalidValue, input),
            );
        } else if (act instanceof RequestChangedValueAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.requestChangedValue, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.requestChangedValue, input),
            );
        } else if (act instanceof ConfirmValueAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.confirmValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.confirmValue, input),
            );
        } else if (act instanceof ValueConfirmedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueAffirmed, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueAffirmed, input),
            );
        } else if (act instanceof ValueDisconfirmedAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.valueDisaffirmed, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueDisaffirmed, input),
            );
        } else {
            this.throwUnhandledActError(act);
        }
    }

    // tsDoc - see Control
    updateInteractionModel(generator: ControlInteractionModelGenerator, imData: ModelData) {
        generator.addControlIntent(new GeneralControlIntent(), imData);
        generator.addControlIntent(new ValueControlIntent(AmazonBuiltInSlotType.DATE), imData);
        generator.addYesAndNoIntents();

        for (const [capability, actionSlotIds] of Object.entries(this.props.interactionModel.actions)) {
            generator.ensureSlotValueIDsAreDefined(this.id, 'action', actionSlotIds);
        }
        generator.ensureSlotValueIDsAreDefined(this.id, 'target', this.props.interactionModel.targets);
    }
}

/**
 * Creates an elicit-slot directive.
 *
 * - The intent specified is a `AMAZON_DATE_ValueControlIntent`
 * - The slot specified is the `AMAZON.DATE` slot.
 *
 * @param slotType - Slot type
 */
function generateSlotElicitation(): { intent: Intent; slotName: string } {
    const intent: Intent = {
        name: ValueControlIntent.intentName(AmazonBuiltInSlotType.DATE),
        slots: {
            feedback: { name: 'feedback', value: '', confirmationStatus: 'NONE' },
            action: { name: 'action', value: '', confirmationStatus: 'NONE' },
            target: { name: 'target', value: '', confirmationStatus: 'NONE' },
            'AMAZON.DATE': { name: 'AMAZON.DATE', value: '', confirmationStatus: 'NONE' },
            head: { name: 'head', value: '', confirmationStatus: 'NONE' },
            tail: { name: 'tail', value: '', confirmationStatus: 'NONE' },
            preposition: { name: 'preposition', value: '', confirmationStatus: 'NONE' },
        },
        confirmationStatus: 'NONE',
    };

    return {
        intent,
        slotName: AmazonBuiltInSlotType.DATE,
    };
}
