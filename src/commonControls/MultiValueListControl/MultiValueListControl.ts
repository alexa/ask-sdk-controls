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
import { Strings as $ } from '../../constants/Strings';
import { Control, ControlInputHandlingProps, ControlProps, ControlState } from '../../controls/Control';
import { ControlAPL } from '../../controls/ControlAPL';
import { ControlInput } from '../../controls/ControlInput';
import { ControlResultBuilder } from '../../controls/ControlResult';
import { InteractionModelContributor } from '../../controls/mixins/InteractionModelContributor';
import { AmazonBuiltInSlotType } from '../../intents/AmazonBuiltInSlotType';
import { GeneralControlIntent, unpackGeneralControlIntent } from '../../intents/GeneralControlIntent';
import {
    MultiValueControlIntent,
    MultiValueSlot,
    unpackMultiValueControlIntent,
} from '../../intents/MultiValueControlIntent';
import { OrdinalControlIntent } from '../../intents/OrdinalControlIntent';
import { ControlInteractionModelGenerator } from '../../interactionModelGeneration/ControlInteractionModelGenerator';
import { ModelData, SharedSlotType } from '../../interactionModelGeneration/ModelTypes';
import { ListFormatting } from '../../intl/ListFormat';
import { Logger } from '../../logging/Logger';
import { ControlResponseBuilder } from '../../responseGeneration/ControlResponseBuilder';
import {
    InvalidValueAct,
    ValueAddedAct,
    ValueChangedAct,
    ValueClearedAct,
    ValueConfirmedAct,
    ValueDisconfirmedAct,
    ValueRemovedAct,
    ValueSetAct,
} from '../../systemActs/ContentActs';
import {
    ConfirmValueAct,
    RequestChangedValueByListAct,
    RequestRemovedValueByListAct,
    RequestValueByListAct,
} from '../../systemActs/InitiativeActs';
import { SystemAct } from '../../systemActs/SystemAct';
import { StringOrList } from '../../utils/BasicTypes';
import { evaluateCustomHandleFuncs, _logIfBothTrue } from '../../utils/ControlUtils';
import { DeepRequired } from '../../utils/DeepRequired';
import { InputUtil } from '../../utils/InputUtil';
import { falseIfGuardFailed, okIf } from '../../utils/Predicates';

const log = new Logger('AskSdkControls:MultiValueListControl');

export type MultiValueValidationResult = {
    /**
     * A code representing what validation failed.
     */
    reasonCode?: string;

    /**
     * A rendered prompt fragment that can be directly included in the `Response`.
     */
    renderedReason?: string;

    invalidValue: string;
};

/**
 * Props for a ListControl.
 */
export interface MultiValueListControlProps extends ControlProps {
    /**
     * Unique identifier for control instance
     */
    id: string;

    /**
     * Slot type for the value that this control collects.
     *
     * Usage:
     * - The slot type defines the set of expected value items.
     * - NLU will, on occasion, accept novel slot value and mark them as
     *   ER_NO_MATCH.  If you only want to accept values that are explicitly
     *   defined add a validation function to test `this.state.erMatch`
     */
    slotType: string;

    /**
     * Function(s) that determine if the value is valid.
     *
     * Default: `true`, i.e. any value is valid.
     *
     * Usage:
     * - Validation functions return either `true` or a `ValidationResult` to
     *   describe what validation failed.
     */
    validation?: SlotValidationFunction | SlotValidationFunction[];

    /**
     * List of slot-value IDs that will be presented to the user as a list.
     */
    listItemIDs: string[] | ((input: ControlInput) => string[]);

    /**
     * The maximum number of items spoken per turn.
     */
    pageSize?: number;

    /**
     * Determines if the Control must obtain a value.
     *
     * - If `true` the Control will take initiative to elicit a value.
     * - If `false` the Control will not take initiative to elicit a value, but the user
     *   can provide one if they wish, e.g. "U: My favorite color is blue".
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
    prompts?: MultiValueListControlPromptProps;

    /**
     * Props to customize the reprompt fragments that will be added by
     * `this.renderAct()`.
     */
    reprompts?: MultiValueListControlPromptProps;

    /**
     * Props to customize the relationship between the control and the
     * interaction model.
     */
    interactionModel?: MultiValueListControlInteractionModelProps;

    /**
     * Props to configure input handling.
     */
    inputHandling?: ControlInputHandlingProps;

    /**
     * Function that maps the MultiValueListControlState.value to rendered value that
     * will be presented to the user as a list.
     *
     * Default: returns the value unchanged.
     */
    valueRenderer?: (value: string[], input: ControlInput) => string[];

    /**
     * Props to customize the APL generated by this control.
     */
    //apl?: MultiValueListControlAPLProps;
}

/**
 * ListControl validation function
 */
export type SlotValidationFunction = (
    state: MultiValueListControlState,
    input: ControlInput,
) => true | MultiValueValidationResult;

/**
 * Mapping of action slot values to the behaviors that this control supports.
 *
 * Behavior:
 * - This control will not handle an input if the action-slot is filled with an
 *   value whose ID is not associated with a capability.
 */
export interface MultiValueListControlActionProps {
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
     * Action slot value IDs that are associated with the "remove value" capability.
     *
     * Default ['builtin_remove', 'builtin_delete', 'builtin_ignore']
     */

    remove?: string[];

    /**
     * Action slot value IDs that are associated with the "add value/s" capability.
     *
     * Default ['builtin_add', 'builtin_select']
     */
    add?: string[];

    /**
     * Action slot value IDs that are associated with the "clear/empty value/s" capability.
     */
    clear?: string[];
}

/**
 * Props associated with the interaction model.
 */
export class MultiValueListControlInteractionModelProps {
    /**
     * Target-slot values associated with this Control.
     *
     * Targets associate utterances to a control. For example, if the user says
     * "change the time", it is parsed as a `GeneralControlIntent` with slot
     * values `action = change` and `target = time`.  Only controls that are
     * registered with the `time` target should offer to handle this intent.
     *
     * Default: `['builtin_it']`
     *
     * Usage:
     * - If this prop is defined, it replaces the default; it is not additive
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
     * Default:
     * ```
     * {
     *    set: ['builtin_set', 'builtin_select'],
     *    change: ['builtin_set']
     * }
     * ```
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
    actions?: MultiValueListControlActionProps;

    /***
     * Additional properties to resolve utterance conflicts caused by the
     * configured slot type.
     *
     * Purpose:
     *  - use these props in situations where the configured slotType has
     *    values/synonyms that cause utterance conflicts.  Most commonly, this
     *    arises when the list control is managing a slotType with values such
     *    as 'yes' and 'no' that conflict with Amazon.YesIntent & Amazon.NoIntent.
     */
    slotValueConflictExtensions?: {
        /**
         * Slot type that is a copy of the main slot type, with problematic values
         * removed.
         *
         * Purpose:
         * - During interaction-model-generation, the `filteredSlotType` is used
         *   in sample-utterances that would cause conflicts if the regular
         *   slotType was used.
         *
         * Example:
         * - if the list is managing a SlotType `ExtendedBoolean` with values
         *   `yes | no | maybe`, create and register a filtered SlotType
         *   `ExtendedBooleanFiltered` that has only the `maybe` value.
         * - during interaction model generation, the risky utterance shapes
         *   will used `ExtendedBooleanFiltered` whereas non-risky utterance shapes
         *   will use `ExtendedBoolean`.
         */
        filteredSlotType: string;

        /**
         * Function that maps an intent to a valueId for props.slotValue.
         *
         * Purpose:
         * * Some simple utterances intended for this control will be
         *   interpreted as intents that are unknown to this control.  This
         *   function allows mapping of them.
         *
         * Example:
         * * if the list is managing a SlotType `ExtendedBoolean` with values
         *   `yes | no | maybe` and filteredSlotType has been configured
         *   correctly then a user-utterance of 'U: yes' will be interpreted as
         *   an `AMAZON.YesIntent`.  To ensure that intent is correctly
         *   processed, declare an intentToValueMapper that maps
         *   `AMAZON.YesIntent -> 'yes'`.  The built-in logic of the ListControl
         *   will thus treat AMAZON.YesIntent as the value 'yes', assuming that the
         *   control is not actively asking a yes/no question.
         */
        intentToValueMapper: (intent: Intent) => string | undefined;
    };
}

/**
 * Props to customize the prompt fragments that will be added by
 * `this.renderAct()`.
 */
export class MultiValueListControlPromptProps {
    valueSet?: StringOrList | ((act: ValueSetAct<any>, input: ControlInput) => StringOrList);
    valueChanged?: StringOrList | ((act: ValueChangedAct<any>, input: ControlInput) => StringOrList);
    invalidValue?: StringOrList | ((act: InvalidValueAct<any>, input: ControlInput) => StringOrList);
    requestValue?: StringOrList | ((act: RequestValueByListAct, input: ControlInput) => StringOrList);
    requestChangedValue?:
        | StringOrList
        | ((act: RequestChangedValueByListAct, input: ControlInput) => StringOrList);
    requestRemovedValue?:
        | StringOrList
        | ((act: RequestRemovedValueByListAct, input: ControlInput) => StringOrList);
    confirmValue?: StringOrList | ((act: ConfirmValueAct<any>, input: ControlInput) => StringOrList);
    valueConfirmed?: StringOrList | ((act: ValueConfirmedAct<any>, input: ControlInput) => StringOrList);
    valueDisconfirmed?:
        | StringOrList
        | ((act: ValueDisconfirmedAct<any>, input: ControlInput) => StringOrList);
    valueAdded?: StringOrList | ((act: ValueAddedAct<any>, input: ControlInput) => StringOrList);
    valueRemoved?: StringOrList | ((act: ValueRemovedAct<any>, input: ControlInput) => StringOrList);
    valueCleared?: StringOrList | ((act: ValueClearedAct<any>, input: ControlInput) => StringOrList);
}

/**
 * Props associated with the APL produced by ListControl.
 */
export class MultiValueListControlAPLProps {
    /**
     * Determines if APL should be produced.
     *
     * Default: true
     */
    enabled?: boolean | ((input: ControlInput) => boolean);

    // TODO js docs
    requestValue?: ControlAPL<RequestValueByListAct, MultiValueListControlState>;
    requestChangedValue?: ControlAPL<RequestChangedValueByListAct, MultiValueListControlState>;
}

export type MultiValueListStateValue = {
    id: string;
    confirmed: boolean;
    erMatch: boolean;
};

export type LastInitiativeState = {
    actName: string;
    valueId: string | string[];
};

/**
 * State tracked by a ListControl.
 */
export class MultiValueListControlState implements ControlState {
    /**
     * The value.
     *
     * If `erMatch = true` the value is a slot value ID for the slot type `this.slotType`.
     * If `erMatch = false` the value may be an arbitrary string.
     */
    value?: MultiValueListStateValue[];
    /**
     * Tracks whether the value is an Entity Resolution match.
     */

    /**
     * Tracks the most recent elicitation action.
     *
     * Note: this isn't cleared immediate after user provides a value as the
     * value maybe be invalid and has to be re-elicited.  Use
     * state.activeInitiate to test if the most recent turn was a direct elicitation.
     */
    elicitationAction?: string;

    /**
     * Index of the page of items most recently spoken.
     */
    spokenItemsPageIndex?: number;

    /**
     * The previous value.
     */
    previousValue?: string[];

    /**
     * Tracks the last initiative act from the control
     */
    activeInitiativeActName?: string;

    lastInitiative?: LastInitiativeState;
}

/**
 * A Control that obtains a single value from the user by presenting a list of
 * available options using voice and/or APL.
 *
 * The type of value to obtain is defined by `this.slotType`.
 *
 * Capabilities:
 * - Request a value
 * - Change a value
 * - Validate the value
 * - Confirm the value
 * - Speak the first few options
 * - Show all the options on APL enabled devices
 * - Selection of a value using a spoken ordinal, e.g. "The first one".
 * - Selection of a value using touch screen.
 *
 * Intents that can be handled:
 * - `GeneralControlIntent`: E.g. `"yes, update my name"`
 * - `{ValueType}_ValueControlIntent`: E.g. "no change it to Elvis".
 * - `AMAZON_ORDINAL_ValueControlIntent`: E.g. "no change it to Elvis".
 * - `AMAZON.YesIntent`, `AMAZON.NoIntent`
 *
 * APL events that can be handled:
 *  - touch events indicating selection of an item on screen.
 *
 * Limitations:
 * - This control is not compatible with the `AMAZON.SearchQuery` slot type.
 */
export class MultiValueListControl extends Control implements InteractionModelContributor {
    state: MultiValueListControlState = new MultiValueListControlState();

    private props: DeepRequired<MultiValueListControlProps>;
    private handleFunc?: (input: ControlInput, resultBuilder: ControlResultBuilder) => void;
    private initiativeFunc?: (input: ControlInput, resultBuilder: ControlResultBuilder) => void;

    constructor(props: MultiValueListControlProps) {
        super(props.id);

        if (props.slotType === AmazonBuiltInSlotType.SEARCH_QUERY) {
            throw new Error(
                'AMAZON.SearchQuery cannot be used with MultiValueListControl due to the special rules regarding its use. ' +
                    'Specifically, utterances that include SearchQuery must have a carrier phrase and not be comprised entirely of slot references. ' +
                    'Use a custom intent to manage SearchQuery slots or create a regular slot for use with MultiValueListControl.',
            );
        }

        this.props = MultiValueListControl.mergeWithDefaultProps(props);
    }

    /**
     * Merges the user-provided props with the default props.
     *
     * Any property defined by the user-provided data overrides the defaults.
     */
    static mergeWithDefaultProps(
        props: MultiValueListControlProps,
    ): DeepRequired<MultiValueListControlProps> {
        const defaults: DeepRequired<MultiValueListControlProps> = {
            id: 'dummy',
            slotType: 'dummy',
            required: true,
            validation: [],
            pageSize: 3,
            listItemIDs: [],
            confirmationRequired: false,
            interactionModel: {
                actions: {
                    set: [$.Action.Set],
                    change: [$.Action.Change],
                    remove: [$.Action.Remove, $.Action.Delete, $.Action.Ignore],
                    add: [$.Action.Select, $.Action.Add],
                    clear: [$.Action.Clear],
                },
                targets: [$.Target.Choice, $.Target.It],
                slotValueConflictExtensions: {
                    filteredSlotType: props.slotType,
                    intentToValueMapper: () => undefined,
                },
            },
            prompts: {
                confirmValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_CONFIRM_VALUE', {
                        value: act.payload.renderedValue,
                    }),
                valueConfirmed: i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_VALUE_AFFIRMED'),
                valueDisconfirmed: i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_VALUE_DISAFFIRMED'),
                valueSet: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_VALUE_SET', {
                        value: act.payload.renderedValue,
                    }),
                valueChanged: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_VALUE_CHANGED', {
                        value: act.payload.renderedValue,
                    }),
                valueAdded: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_VALUE_ADD', {
                        value: act.payload.renderedValue,
                    }),
                valueRemoved: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_VALUE_REMOVE', {
                        value: act.payload.renderedValue,
                    }),
                valueCleared: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_VALUE_CLEARED', {
                        value: act.payload.renderedValue,
                    }),
                invalidValue: (act) => {
                    if (act.payload.renderedReason !== undefined) {
                        return i18next.t(
                            'MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_INVALID_VALUE_WITH_REASON',
                            {
                                value: act.payload.renderedValue,
                                reason: act.payload.renderedReason,
                            },
                        );
                    }
                    return i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_GENERAL_INVALID_VALUE');
                },
                requestValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_REQUEST_VALUE', {
                        suggestions: ListFormatting.format(act.payload.renderedChoicesFromActivePage),
                    }),
                requestChangedValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_REQUEST_CHANGED_VALUE', {
                        suggestions: ListFormatting.format(act.payload.renderedChoicesFromActivePage),
                    }),
                requestRemovedValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_REQUEST_REMOVED_VALUE', {
                        suggestions: ListFormatting.format(act.payload.renderedChoicesFromActivePage),
                    }),
            },
            reprompts: {
                confirmValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_CONFIRM_VALUE', {
                        value: act.payload.renderedValue,
                    }),
                valueConfirmed: i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_VALUE_AFFIRMED'),
                valueDisconfirmed: i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_VALUE_DISAFFIRMED'),
                valueSet: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_VALUE_SET', {
                        value: act.payload.renderedValue,
                    }),
                valueChanged: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_VALUE_CHANGED', {
                        value: act.payload.renderedValue,
                    }),
                valueAdded: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_VALUE_ADD', {
                        value: act.payload.renderedValue,
                    }),
                valueRemoved: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_VALUE_REMOVE', {
                        value: act.payload.renderedValue,
                    }),
                valueCleared: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_VALUE_CLEARED', {
                        value: act.payload.renderedValue,
                    }),
                invalidValue: (act) => {
                    if (act.payload.renderedReason !== undefined) {
                        return i18next.t(
                            'MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_INVALID_VALUE_WITH_REASON',
                            {
                                value: act.payload.renderedValue,
                                reason: act.payload.renderedReason,
                            },
                        );
                    }
                    return i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_GENERAL_INVALID_VALUE');
                },
                requestValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_REQUEST_VALUE', {
                        suggestions: ListFormatting.format(act.payload.renderedChoicesFromActivePage),
                    }),
                requestChangedValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_REQUEST_CHANGED_VALUE', {
                        suggestions: ListFormatting.format(act.payload.renderedChoicesFromActivePage),
                    }),
                requestRemovedValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_REQUEST_REMOVED_VALUE', {
                        suggestions: ListFormatting.format(act.payload.renderedChoicesFromActivePage),
                    }),
            },
            inputHandling: {
                customHandlingFuncs: [],
            },
            valueRenderer: (value, input) => value,
        };

        return _.merge(defaults, props);
    }

    // tsDoc - see Control
    async canHandle(input: ControlInput): Promise<boolean> {
        const customCanHandle = await evaluateCustomHandleFuncs(this, input);
        const builtInCanHandle: boolean =
            this.isAddWithValue(input) ||
            this.isChangeWithValue(input) ||
            this.isRemoveWithValue(input) ||
            this.isSetWithValue(input) ||
            this.isConfirmationAffirmed(input) ||
            this.isConfirmationDisaffirmed(input) ||
            this.isBareValue(input) ||
            this.isClearValue(input);

        _logIfBothTrue(customCanHandle, builtInCanHandle);
        return customCanHandle || builtInCanHandle;
    }

    // tsDoc - see Control
    async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        if (this.handleFunc === undefined) {
            log.error(
                'MultiValueListControl: handle called but no clause matched.  are canHandle/handle out of sync?',
            );
            const intent: Intent = (input.request as IntentRequest).intent;
            throw new Error(`${intent.name} can not be handled by ${this.constructor.name}.`);
        }

        await this.handleFunc(input, resultBuilder);
        if (resultBuilder.hasInitiativeAct() !== true && this.canTakeInitiative(input) === true) {
            await this.takeInitiative(input, resultBuilder);
        }
    }

    private isAddWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, MultiValueControlIntent.intentName(this.props.slotType)));
            const { feedback, action, target, values, valueType } = unpackMultiValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueTypeMatch(valueType, this.props.slotType));
            okIf(InputUtil.valueStrDefined(values));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.add));
            this.handleFunc = this.handleAddWithValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleAddWithValue(input: ControlInput, resultBuilder: ControlResultBuilder) {
        const slotValues = InputUtil.getMultiValueResolution(input);
        this.addSlotValues(slotValues);
        this.evaluateAndAddActs(input, resultBuilder, $.Action.Add);
    }

    private isChangeWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, MultiValueControlIntent.intentName(this.props.slotType)));
            const { feedback, action, target, values, valueType } = unpackMultiValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueTypeMatch(valueType, this.props.slotType));
            okIf(InputUtil.valueStrDefined(values));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.change));
            this.handleFunc = this.handleChangeWithValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleChangeWithValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const slotValues = InputUtil.getMultiValueResolution(input);
        this.updateValueOnLastInitiative();
        this.addSlotValues(slotValues);
        this.evaluateAndAddActs(input, resultBuilder, $.Action.Change);
        return;
    }

    private isRemoveWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, MultiValueControlIntent.intentName(this.props.slotType)));
            const { feedback, action, target, values, valueType } = unpackMultiValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueTypeMatch(valueType, this.props.slotType));
            okIf(InputUtil.valueStrDefined(values));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.remove));
            this.handleFunc = this.handleRemoveWithValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleRemoveWithValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const slotValues = InputUtil.getMultiValueResolution(input);
        const valueIds = slotValues.map(({ slotValue }) => slotValue as string);
        const stateValues: MultiValueListStateValue[] = this.state.value!;
        const deletedValues = [];
        for (const value of valueIds) {
            const removeIndex = stateValues.map((value) => value.id).indexOf(value);
            if (removeIndex === -1) {
                resultBuilder.addAct(
                    new InvalidValueAct<string>(this, {
                        value,
                        renderedValue: this.evaluateRenderedValue(value, input),
                        renderedReason: 'The value does not exist on state',
                    }),
                );
                this.askElicitationQuestion(input, resultBuilder, $.Action.Remove);
                return;
            }
            deletedValues.push(value);
            stateValues.splice(removeIndex, 1);
        }
        resultBuilder.addAct(
            new ValueRemovedAct(this, {
                value: deletedValues,
                renderedValue: this.evaluateRenderedValue(deletedValues, input),
            }),
        );
    }

    private isSetWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, MultiValueControlIntent.intentName(this.props.slotType)));
            const { feedback, action, target, values, valueType } = unpackMultiValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueTypeMatch(valueType, this.props.slotType));
            okIf(InputUtil.valueStrDefined(values));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.set));
            this.handleFunc = this.handleSetWithValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleSetWithValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const slotValues = InputUtil.getMultiValueResolution(input);
        this.clear();
        this.addSlotValues(slotValues);
        this.evaluateAndAddActs(input, resultBuilder, $.Action.Set);
    }

    private isConfirmationAffirmed(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isBareYes(input));
            okIf(InputUtil.lastInitiativeMatch(this.state.lastInitiative, ConfirmValueAct.name));
            this.handleFunc = this.handleConfirmationAffirmed;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleConfirmationAffirmed(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const valueId = this.state.lastInitiative!.valueId as string[];
        if (valueId !== undefined) {
            valueId.forEach((value) => {
                this.state.value!.find(({ id }) => id === value)!.confirmed = true;
            });
            this.state.lastInitiative = undefined;
            resultBuilder.addAct(
                new ValueConfirmedAct(this, {
                    value: valueId,
                    renderedValue: this.evaluateRenderedValue(valueId, input),
                }),
            );
        }
        return;
    }

    private isConfirmationDisaffirmed(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isBareNo(input));
            okIf(InputUtil.lastInitiativeMatch(this.state.lastInitiative, ConfirmValueAct.name));
            this.handleFunc = this.handleConfirmationDisaffirmed;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleConfirmationDisaffirmed(): void {
        const values = this.state.lastInitiative!.valueId;
        // If values to be confirmed are more than one. Confirm them individually.
        if (values.length === 1) {
            const deleteValue = this.state.lastInitiative!.valueId;
            const removeIndex = this.state.value!.map((value) => value.id).indexOf(deleteValue[0]);
            this.state.value!.splice(removeIndex, 1);
        }
        this.state.lastInitiative = undefined;
        return;
    }

    private isBareValue(input: ControlInput): any {
        try {
            okIf(InputUtil.isIntent(input, MultiValueControlIntent.intentName(this.props.slotType)));
            const { feedback, action, target, values, valueType } = unpackMultiValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsUndefined(action));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueStrDefined(values));
            okIf(
                InputUtil.valueTypeMatch(
                    valueType,
                    this.props.interactionModel.slotValueConflictExtensions.filteredSlotType,
                ),
            );
            this.handleFunc = this.handleBareValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleBareValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const slotValues = InputUtil.getMultiValueResolution(input);
        this.updateValueOnLastInitiative();
        this.addSlotValues(slotValues);
        this.evaluateAndAddActs(input, resultBuilder, $.Action.Add);
        return;
    }

    private evaluateAndAddActs(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
        elicitationAction: string,
    ) {
        if (this.isConfirmationRequired(input) === true) {
            const valueIds = this.getSlotIdsToConfirm();
            this.state.lastInitiative = {
                actName: ConfirmValueAct.name,
                valueId: valueIds,
            };
            resultBuilder.addAct(
                new ConfirmValueAct(this, {
                    value: valueIds,
                    renderedValue: this.evaluateRenderedValue(valueIds, input),
                }),
            );
            return;
        }

        const valueIds = this.getSlotIds();

        switch (elicitationAction) {
            case $.Action.Add:
                resultBuilder.addAct(
                    new ValueAddedAct(this, {
                        value: valueIds,
                        renderedValue: this.evaluateRenderedValue(valueIds, input),
                    }),
                );
                this.state.lastInitiative = undefined;
                return;
            case $.Action.Change: {
                const previousValue: string[] = [this.state.lastInitiative!.valueId as string];
                resultBuilder.addAct(
                    new ValueChangedAct(this, {
                        value: valueIds,
                        renderedValue: this.evaluateRenderedValue(valueIds, input),
                        previousValue,
                        renderedPreviousValue: this.evaluateRenderedValue(valueIds, input),
                    }),
                );
                this.state.lastInitiative = undefined;
                return;
            }
            case $.Action.Set:
                resultBuilder.addAct(
                    new ValueSetAct(this, {
                        value: valueIds,
                        renderedValue: this.evaluateRenderedValue(valueIds, input),
                    }),
                );
                this.state.lastInitiative = undefined;
                return;
            default:
                throw new Error(`Unhandled. Unknown elicitationAction: ${elicitationAction}`);
        }
    }

    private addSlotValues(values: MultiValueSlot[]): void {
        // Add the new values to state with confirmation set to false
        values.forEach((value) => {
            this.addValue({
                id: value.slotValue as string,
                confirmed: false,
                erMatch: value.isEntityResolutionMatch as boolean,
            });
        });
    }

    private updateValueOnLastInitiative() {
        if (
            this.state.lastInitiative !== undefined &&
            (this.state.lastInitiative.actName === InvalidValueAct.name ||
                this.state.lastInitiative.actName === ConfirmValueAct.name) // disaffirm feedback with values use-case
        ) {
            // delete the changed value from state
            const values: MultiValueListStateValue[] = this.state.value!;
            const deleteValueList = Array.isArray(this.state.lastInitiative.valueId)
                ? this.state.lastInitiative.valueId
                : [this.state.lastInitiative.valueId];
            deleteValueList.forEach((deleteValue) => {
                const removeIndex = values.map((value) => value.id).indexOf(deleteValue);
                values.splice(removeIndex, 1);
            });
        }
    }

    private isClearValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, GeneralControlIntent.name));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.clear));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            this.handleFunc = this.handleClearValue;
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleClearValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const valueIds = this.getSlotIds();
        this.clear();
        resultBuilder.addAct(
            new ValueClearedAct(this, {
                value: valueIds,
                renderedValue: this.evaluateRenderedValue(valueIds, input),
            }),
        );
        return;
    }

    private isConfirmationRequired(input: ControlInput) {
        if (typeof this.props.confirmationRequired === 'function') {
            return this.props.confirmationRequired(input);
        } else if (typeof this.props.confirmationRequired === 'boolean') {
            return this.props.confirmationRequired;
        } else {
            return true; // by default confirmation is required
        }
    }

    /**
     * Add the value to state of this control.
     *
     * @param value - Value
     */
    addValue(value: MultiValueListStateValue) {
        if (this.state.value !== undefined) {
            this.state.value.push(value);
        } else {
            this.state.value = [value];
        }
    }

    /**
     * Clear the state of this control.
     */
    clear() {
        this.state = new MultiValueListControlState();
    }

    // tsDoc - see Control
    canTakeInitiative(input: ControlInput): boolean {
        return (
            this.wantsToConfirmValue(input) ||
            this.wantsToFixInvalidValue(input) ||
            this.wantsToElicitValue(input)
        );
    }

    // tsDoc - see Control
    async takeInitiative(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        if (this.initiativeFunc === undefined) {
            const errorMsg =
                'MultiValueListControl: takeInitiative called but this.initiativeFunc is not set. canTakeInitiative() should be called first to set this.initiativeFunc.';
            log.error(errorMsg);
            throw new Error(errorMsg);
        }
        this.initiativeFunc(input, resultBuilder);
        return;
    }

    private wantsToConfirmValue(input: ControlInput): boolean {
        if (
            this.evaluateBooleanProp(this.props.confirmationRequired, input) &&
            this.state.value !== undefined &&
            this.state.value.length !== 0 &&
            this.isSlotValuesConfirmed() !== true
        ) {
            this.initiativeFunc = this.confirmValue;
            return true;
        }
        return false;
    }

    private isSlotValuesConfirmed(): boolean {
        const values = this.state.value;
        if (values !== undefined) {
            const valuesToBeConfirmed = this.getSlotIdsToConfirm();
            return valuesToBeConfirmed.length === 0;
        }
        return true;
    }

    private confirmValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const valueIds = this.getSlotIdsToConfirm();
        if (this.state.lastInitiative === undefined) {
            valueIds.splice(1);
        }
        this.state.lastInitiative = {
            actName: ConfirmValueAct.name,
            valueId: valueIds,
        };
        resultBuilder.addAct(
            new ConfirmValueAct(this, {
                value: valueIds,
                renderedValue: this.evaluateRenderedValue(valueIds, input),
            }),
        );
    }

    private wantsToFixInvalidValue(input: ControlInput): boolean {
        if (this.state.value !== undefined && this.isSlotValuesValid(input) !== true) {
            this.initiativeFunc = this.fixInvalidValue;
            return true;
        }
        return false;
    }

    private isSlotValuesValid(input: ControlInput): boolean {
        const values = this.state.value;
        if (values !== undefined) {
            const validationResult = this.validate(input);
            return typeof validationResult === 'boolean' ? true : false;
        }
        return true;
    }

    private fixInvalidValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const validationResult = this.validate(input);
        if (validationResult !== true) {
            this.state.lastInitiative = {
                actName: InvalidValueAct.name,
                valueId: validationResult.invalidValue,
            };
            resultBuilder.addAct(
                new InvalidValueAct<string>(this, {
                    value: validationResult.invalidValue,
                    renderedValue: this.evaluateRenderedValue(validationResult.invalidValue, input),
                    reasonCode: validationResult.reasonCode,
                    renderedReason: validationResult.renderedReason,
                }),
            );
        }
        this.askElicitationQuestion(input, resultBuilder, $.Action.Change);
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

    private validate(input: ControlInput) {
        const listOfValidationFunc: SlotValidationFunction[] =
            typeof this.props.validation === 'function' ? [this.props.validation] : this.props.validation;
        for (const validationFunction of listOfValidationFunc) {
            const validationResult: true | MultiValueValidationResult = validationFunction(this.state, input);
            if (validationResult !== true) {
                log.debug(
                    `MultiValueListControl.validate(): validation failed. Reason: ${JSON.stringify(
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

    private askElicitationQuestion(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
        elicitationAction: string,
    ) {
        this.state.elicitationAction = elicitationAction;
        const allChoices = this.getChoicesList(input);
        if (allChoices === null) {
            throw new Error('MultiValueListControl.listItemIDs is null');
        }

        const choicesFromActivePage = this.getChoicesFromActivePage(allChoices);
        switch (elicitationAction) {
            case $.Action.Set:
                resultBuilder.addAct(
                    new RequestValueByListAct(this, {
                        choicesFromActivePage,
                        allChoices,
                        renderedChoicesFromActivePage: this.props.valueRenderer(choicesFromActivePage, input),
                        renderedAllChoices: this.props.valueRenderer(allChoices, input),
                    }),
                );
                return;
            case $.Action.Change: {
                const value = this.state.lastInitiative!.valueId;
                const currentValue = Array.isArray(value) ? value[0] : value;
                resultBuilder.addAct(
                    new RequestChangedValueByListAct(this, {
                        currentValue,
                        renderedValue: this.evaluateRenderedValue(currentValue, input),
                        choicesFromActivePage,
                        allChoices,
                        renderedChoicesFromActivePage: this.props.valueRenderer(choicesFromActivePage, input),
                        renderedAllChoices: this.props.valueRenderer(allChoices, input),
                    }),
                );
                return;
            }
            case $.Action.Remove: {
                const availableChoices = this.getSlotIds();
                const availableChoicesFromActivePage = this.getChoicesFromActivePage(availableChoices);
                resultBuilder.addAct(
                    new RequestRemovedValueByListAct(this, {
                        availableChoicesFromActivePage,
                        availableChoices,
                        renderedChoicesFromActivePage: this.props.valueRenderer(
                            availableChoicesFromActivePage,
                            input,
                        ),
                        renderedAvailableChoices: this.props.valueRenderer(availableChoices, input),
                    }),
                );
                return;
            }
            default:
                throw new Error(`Unhandled. Unknown elicitationAction: ${elicitationAction}`);
        }
    }

    // tsDoc - see ControlStateDiagramming
    stringifyStateForDiagram(): string {
        let text = this.state.value ? this.state.value.join(', ') : '<none>';
        if (this.state.elicitationAction !== undefined) {
            text += `[eliciting, ${this.state.elicitationAction}]`;
        }
        return text;
    }

    private getChoicesList(input: ControlInput): string[] {
        const slotIds: string[] =
            typeof this.props.listItemIDs === 'function'
                ? this.props.listItemIDs.call(this, input)
                : this.props.listItemIDs;
        return slotIds;
    }

    private getChoicesFromActivePage(allChoices: string[]): string[] {
        const start = this.getPageIndex();
        const end = start + this.props.pageSize;
        return allChoices.slice(start, end);
    }

    private getPageIndex(): number {
        if (this.state.spokenItemsPageIndex === undefined) {
            this.state.spokenItemsPageIndex = 0;
        }
        return this.state.spokenItemsPageIndex;
    }

    // tsDoc - see Control
    renderAct(act: SystemAct, input: ControlInput, builder: ControlResponseBuilder): void {
        if (act instanceof RequestValueByListAct) {
            const prompt = this.evaluatePromptProp(act, this.props.prompts.requestValue, input);
            const reprompt = this.evaluatePromptProp(act, this.props.reprompts.requestValue, input);

            builder.addPromptFragment(this.evaluatePromptProp(act, prompt, input));
            builder.addRepromptFragment(this.evaluatePromptProp(act, reprompt, input));

            // if (
            //     this.evaluateBooleanProp(this.props.apl.enabled, input) === true &&
            //     getSupportedInterfaces(input.handlerInput.requestEnvelope)['Alexa.Presentation.APL']
            // ) {
            //     const document = this.evaluateAPLProp(act, input, this.props.apl.requestValue.document);
            //     const dataSource = this.evaluateAPLProp(act, input, this.props.apl.requestValue.dataSource);
            //     builder.addAPLRenderDocumentDirective('Token', document, dataSource);
            // }
        } else if (act instanceof RequestChangedValueByListAct) {
            const prompt = this.evaluatePromptProp(act, this.props.prompts.requestChangedValue, input);
            const reprompt = this.evaluatePromptProp(act, this.props.reprompts.requestChangedValue, input);

            builder.addPromptFragment(this.evaluatePromptProp(act, prompt, input));
            builder.addRepromptFragment(this.evaluatePromptProp(act, reprompt, input));

            // if (
            //     this.evaluateBooleanProp(this.props.apl.enabled, input) === true &&
            //     getSupportedInterfaces(input.handlerInput.requestEnvelope)['Alexa.Presentation.APL']
            // ) {
            //     const document = this.evaluateAPLProp(
            //         act,
            //         input,
            //         this.props.apl.requestChangedValue.document,
            //     );
            //     const dataSource = this.evaluateAPLProp(
            //         act,
            //         input,
            //         this.props.apl.requestChangedValue.dataSource,
            //     );
            //     builder.addAPLRenderDocumentDirective('Token', document, dataSource);
            // }
        } else if (act instanceof RequestRemovedValueByListAct) {
            const prompt = this.evaluatePromptProp(act, this.props.prompts.requestRemovedValue, input);
            const reprompt = this.evaluatePromptProp(act, this.props.reprompts.requestRemovedValue, input);

            builder.addPromptFragment(this.evaluatePromptProp(act, prompt, input));
            builder.addRepromptFragment(this.evaluatePromptProp(act, reprompt, input));

            // if (
            //     this.evaluateBooleanProp(this.props.apl.enabled, input) === true &&
            //     getSupportedInterfaces(input.handlerInput.requestEnvelope)['Alexa.Presentation.APL']
            // ) {
            //     const document = this.evaluateAPLProp(act, input, this.props.apl.requestValue.document);
            //     const dataSource = this.evaluateAPLProp(act, input, this.props.apl.requestValue.dataSource);
            //     builder.addAPLRenderDocumentDirective('Token', document, dataSource);
            // }
        } else if (act instanceof InvalidValueAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.invalidValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.invalidValue, input),
            );
        } else if (act instanceof ValueSetAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueSet, input));
            builder.addRepromptFragment(this.evaluatePromptProp(act, this.props.reprompts.valueSet, input));
        } else if (act instanceof ValueChangedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueChanged, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueChanged, input),
            );
        } else if (act instanceof ValueAddedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueAdded, input));
            builder.addRepromptFragment(this.evaluatePromptProp(act, this.props.reprompts.valueAdded, input));
        } else if (act instanceof ValueClearedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueCleared, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueCleared, input),
            );
        } else if (act instanceof ValueRemovedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueRemoved, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueRemoved, input),
            );
        } else if (act instanceof ConfirmValueAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.confirmValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.confirmValue, input),
            );
        } else if (act instanceof ValueConfirmedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueConfirmed, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueConfirmed, input),
            );
        } else if (act instanceof ValueDisconfirmedAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.valueDisconfirmed, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueDisconfirmed, input),
            );
        } else {
            this.throwUnhandledActError(act);
        }
    }

    // tsDoc - see Control
    updateInteractionModel(generator: ControlInteractionModelGenerator, imData: ModelData) {
        generator.addControlIntent(new GeneralControlIntent(), imData);
        generator.addControlIntent(
            new MultiValueControlIntent(
                this.props.slotType,
                this.props.interactionModel.slotValueConflictExtensions.filteredSlotType,
            ),
            imData,
        );
        generator.addControlIntent(new OrdinalControlIntent(), imData);
        generator.addYesAndNoIntents();

        if (this.props.interactionModel.targets.includes($.Target.Choice)) {
            generator.addValuesToSlotType(
                SharedSlotType.TARGET,
                i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_SLOT_VALUES_TARGET_CHOICE', {
                    returnObjects: true,
                }),
            );
        }

        if (this.props.interactionModel.actions.set.includes($.Action.Select)) {
            generator.addValuesToSlotType(
                SharedSlotType.ACTION,
                i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_SLOT_VALUES_ACTION_SELECT', {
                    returnObjects: true,
                }),
            );
        }
    }

    // tsDoc - see InteractionModelContributor
    getTargetIds() {
        return this.props.interactionModel.targets;
    }
    // TODO: feature: use slot elicitation when requesting.

    private evaluateRenderedValue(value: string | string[], input: ControlInput): string {
        const renderedValue = Array.isArray(value) ? value : [value];
        return ListFormatting.format(this.props.valueRenderer(renderedValue, input), 'and');
    }

    private getSlotIds(): string[] {
        return this.state.value!.map(({ id }) => id);
    }

    private getSlotIdsToConfirm(): string[] {
        return this.state.value!.filter(({ confirmed }) => confirmed === false).map(({ id }) => id);
    }
}
