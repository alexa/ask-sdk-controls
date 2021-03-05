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

import { getSupportedInterfaces } from 'ask-sdk-core/dist/util/RequestEnvelopeUtils';
import { Intent, IntentRequest, interfaces } from 'ask-sdk-model';
import { assert } from 'chai';
import i18next from 'i18next';
import _ from 'lodash';
import { ModelData, StringOrList } from '../..';
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
import { InteractionModelContributor } from '../../controls/mixins/InteractionModelContributor';
import { AmazonBuiltInSlotType } from '../../intents/AmazonBuiltInSlotType';
import { GeneralControlIntent, unpackGeneralControlIntent } from '../../intents/GeneralControlIntent';
import {
    MultiValueSlot,
    unpackValueControlIntent,
    ValueControlIntent,
} from '../../intents/ValueControlIntent';
import { ControlInteractionModelGenerator } from '../../interactionModelGeneration/ControlInteractionModelGenerator';
import { ListFormatting } from '../../intl/ListFormat';
import { Logger } from '../../logging/Logger';
import { APLMode } from '../../responseGeneration/AplMode';
import { ControlResponseBuilder } from '../../responseGeneration/ControlResponseBuilder';
import {
    InvalidRemoveValueAct,
    InvalidValueAct,
    ValueAddedAct,
    ValueClearedAct,
    ValueConfirmedAct,
    ValueRemovedAct,
} from '../../systemActs/ContentActs';
import {
    ConfirmValueAct,
    RequestRemovedValueByListAct,
    RequestValueByListAct,
    SuggestActionAct,
} from '../../systemActs/InitiativeActs';
import { SystemAct } from '../../systemActs/SystemAct';
import { evaluateInputHandlers } from '../../utils/ControlUtils';
import { DeepRequired } from '../../utils/DeepRequired';
import { InputUtil } from '../../utils/InputUtil';
import { falseIfGuardFailed, okIf } from '../../utils/Predicates';
import {
    MultiValueListControlAPLPropsBuiltIns,
    MultiValueListControlComponentAPLBuiltIns,
} from './MultiValueListControlAPL';
const log = new Logger('AskSdkControls:MultiValueListControl');

export type MultiValueValidationFailure = {
    // TODO: Move to StateValidationFunction<TState>
    /**
     * A code representing what validation failed.
     */
    reasonCode?: string;

    /**
     * A rendered prompt fragment that can be directly included in the `Response`.
     */
    renderedReason: string;

    /**
     * A list of values which fails validation.
     */
    invalidValues: string[];
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
    apl?: MultiValueListControlAPLProps;
}

/**
 * ListControl validation function
 */
export type SlotValidationFunction = (
    values: MultiValueListStateValue[],
    input: ControlInput,
) => true | MultiValueValidationFailure | Promise<true | MultiValueValidationFailure>;

export type AplContent = { document: { [key: string]: any }; dataSource: { [key: string]: any } };
export type AplContentFunc = (control: MultiValueListControl, input: ControlInput) => AplContent;
export type AplDocumentPropNewStyle = AplContent | AplContentFunc;
export type AplRenderComponentFunc = (
    control: MultiValueListControl,
    props: MultiValueListAPLComponentProps,
    input: ControlInput,
    resultBuilder: ControlResponseBuilder,
) => { [key: string]: any };

/**
 * Mapping of action slot values to the capability that this control supports.
 *
 * Behavior:
 * - This control will not handle an input if the action-slot is filled with an
 *   value whose ID is not associated with a capability.
 */
export interface MultiValueListControlActionProps {
    /**
     * Action slot value IDs that are associated with the "add value/s" capability.
     *
     * Default ['builtin_add', 'builtin_select']
     */
    add?: string[];

    /**
     * Action slot value IDs that are associated with the "remove value" capability.
     *
     * Default ['builtin_remove', 'builtin_delete', 'builtin_ignore']
     */

    remove?: string[];

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
    invalidValue?: StringOrList | ((act: InvalidValueAct<any>, input: ControlInput) => StringOrList);
    invalidRemoveValue?:
        | StringOrList
        | ((act: InvalidRemoveValueAct<any>, input: ControlInput) => StringOrList);
    requestValue?: StringOrList | ((act: RequestValueByListAct, input: ControlInput) => StringOrList);
    requestRemovedValue?:
        | StringOrList
        | ((act: RequestRemovedValueByListAct, input: ControlInput) => StringOrList);
    confirmValue?: StringOrList | ((act: ConfirmValueAct<any>, input: ControlInput) => StringOrList);
    valueConfirmed?: StringOrList | ((act: ValueConfirmedAct<any>, input: ControlInput) => StringOrList);
    valueAdded?: StringOrList | ((act: ValueAddedAct<any>, input: ControlInput) => StringOrList);
    valueRemoved?: StringOrList | ((act: ValueRemovedAct<any>, input: ControlInput) => StringOrList);
    valueCleared?: StringOrList | ((act: ValueClearedAct<any>, input: ControlInput) => StringOrList);
    suggestAction?: StringOrList | ((act: SuggestActionAct<any>, input: ControlInput) => StringOrList);
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

    /**
     * Custom APL to request value from list of choices.
     */
    requestValue?: AplDocumentPropNewStyle;

    /**
     * Determines the APL Component rendering mode.
     *
     * Usage:
     *
     * 1) Use pre-defined built-ins under MultiValueListControlComponentAPLBuiltIns.* namespace which provides both default
     * implementations and customization of props(MultiValueListAPLComponentProps) to render an APL component.
     *
     * e.g  renderComponent: MultiValueListControlComponentAPLBuiltIns.DualTextListRender.default --- Default Implementation
     *      renderComponent: MultiValueListControlComponentAPLBuiltIns.DualTextListRender.default.of(props: MultiValueListAPLComponentProps) --- Override few properties
     *
     * 2) Provide a custom function which returns an APL component.
     *
     *
     * Default: MultiValueListControlComponentAPLBuiltIns.DualTextListRender.default
     */
    renderComponent?: AplRenderComponentFunc;
}

export type MultiValueListStateValue = {
    /**
     * Track the slot value.
     */
    id: string;

    /**
     * Tracks whether the value is an Entity Resolution match.
     *
     * If `erMatch = true` the value is a slot value ID for the slot type `this.slotType`.
     * If `erMatch = false` the value may be an arbitrary string.
     */
    erMatch: boolean;
};

interface LastInitiativeState {
    /**
     * Tracks the last act initiated from the control.
     */
    actName?: string;

    /**
     * A list of values which are used in last initiative act.
     */
    valueIds?: string[];
}

export interface MultiValueListAPLComponentProps {
    /**
     * Function that maps the MultiValueListControlState.value to rendered value that
     * will be presented to the user as a list.
     *
     * Default: returns the value unchanged.
     */
    valueRenderer?: (value: string[], input: ControlInput) => string[];
}

/**
 * State tracked by a ListControl.
 */
export class MultiValueListControlState implements ControlState {
    /**
     * The list of values as [ (id1, erMatch), (id2, erMatch) ]
     */
    value: MultiValueListStateValue[];

    /**
     * Tracks the most recent elicitation action.
     *
     * Note: this isn't cleared immediate after user provides a value as the
     * value maybe be invalid and has to be re-elicited.  Use
     * state.lastInitiative to test if the most recent turn was a direct elicitation.
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
    lastInitiative: LastInitiativeState;

    /**
     * Tracks if the control state values are confirmed
     */
    confirmed?: boolean;
}

/**
 * A Control that obtains multiple values from the user by presenting a list of
 * available options using voice and/or APL.
 *
 * The type of value to obtain is defined by `this.slotType`.
 *
 * Capabilities:
 * - Request a value or list of values
 * - Remove a value or list of values
 * - Validate the value/values
 * - Confirm the values
 * - Speak the first few options
 * - Show all the options on APL enabled devices
 * - Selection of a value using a spoken ordinal, e.g. "The first one".
 * - Selection of a value using touch screen.
 *
 * Intents that can be handled:
 * - `GeneralControlIntent`: E.g. `"no, clear all names"`
 * - `{ValueType}_ValueControlIntent`: E.g. "add Elvis, May and Max".
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

    private rawProps: MultiValueListControlProps;
    private props: DeepRequired<MultiValueListControlProps>;
    private handleFunc?: (input: ControlInput, resultBuilder: ControlResultBuilder) => void | Promise<void>;
    private initiativeFunc?: (
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ) => void | Promise<void>;

    constructor(props: MultiValueListControlProps) {
        super(props.id);
        this.rawProps = props;
        if (props.slotType === AmazonBuiltInSlotType.SEARCH_QUERY) {
            throw new Error(
                'AMAZON.SearchQuery cannot be used with MultiValueListControl due to the special rules regarding its use. ' +
                    'Specifically, utterances that include SearchQuery must have a carrier phrase and not be comprised entirely of slot references. ' +
                    'Use a custom intent to manage SearchQuery slots or create a regular slot for use with MultiValueListControl.',
            );
        }
        this.props = MultiValueListControl.mergeWithDefaultProps(props);
        if (this.props.interactionModel.slotValueConflictExtensions.filteredSlotType === 'dummy') {
            this.props.interactionModel.slotValueConflictExtensions.filteredSlotType = this.props.slotType;
        }
        this.state.value = [];
        this.state.lastInitiative = {};
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
                    remove: [$.Action.Remove, $.Action.Ignore],
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
                suggestAction: (act) => i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_ACTION_SUGGEST'),
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
                    return i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_GENERAL_INVALID_VALUE', {
                        value: act.payload.renderedValue,
                    });
                },
                invalidRemoveValue: (act) => {
                    return i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_GENERAL_INVALID_REMOVE_VALUE', {
                        value: act.payload.renderedValue,
                    });
                },
                requestValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_REQUEST_VALUE', {
                        suggestions: ListFormatting.format(act.payload.renderedChoicesFromActivePage),
                    }),
                requestRemovedValue: (act) => {
                    if (
                        act.payload.availableChoicesFromActivePage !== undefined &&
                        act.payload.availableChoicesFromActivePage.length > 0
                    ) {
                        return i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_REQUEST_REMOVED_VALUE', {
                            suggestions: ListFormatting.format(act.payload.renderedChoicesFromActivePage),
                        });
                    }
                    return i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_GENERAL_REQUEST_REMOVED_VALUE');
                },
            },
            reprompts: {
                confirmValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_CONFIRM_VALUE', {
                        value: act.payload.renderedValue,
                    }),
                valueConfirmed: i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_VALUE_AFFIRMED'),
                valueAdded: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_VALUE_ADD', {
                        value: act.payload.renderedValue,
                    }),
                valueRemoved: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_VALUE_REMOVE', {
                        value: act.payload.renderedValue,
                    }),
                valueCleared: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_VALUE_CLEARED', {
                        value: act.payload.renderedValue,
                    }),
                suggestAction: (act) => i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_ACTION_SUGGEST'),
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
                    return i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_GENERAL_INVALID_VALUE', {
                        value: act.payload.renderedValue,
                    });
                },
                invalidRemoveValue: (act) => {
                    return i18next.t(
                        'MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_GENERAL_INVALID_REMOVE_VALUE',
                        {
                            value: act.payload.renderedValue,
                        },
                    );
                },
                requestValue: (act) =>
                    i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_REPROMPT_REQUEST_VALUE', {
                        suggestions: ListFormatting.format(act.payload.renderedChoicesFromActivePage),
                    }),
                requestRemovedValue: (act) => {
                    if (
                        act.payload.availableChoicesFromActivePage !== undefined &&
                        act.payload.availableChoicesFromActivePage.length > 0
                    ) {
                        return i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_REQUEST_REMOVED_VALUE', {
                            suggestions: ListFormatting.format(act.payload.renderedChoicesFromActivePage),
                        });
                    }
                    return i18next.t('MULTI_VALUE_LIST_CONTROL_DEFAULT_PROMPT_GENERAL_REQUEST_REMOVED_VALUE');
                },
            },
            apl: {
                enabled: true,
                requestValue: MultiValueListControlAPLPropsBuiltIns.defaultSelectValueAPLContent({
                    valueRenderer: (choice, input) => choice, // TODO: Pass the valueRenderer prop
                }),
                renderComponent: MultiValueListControlComponentAPLBuiltIns.DualTextListRender.default,
            },
            inputHandling: {
                customHandlingFuncs: [],
            },
            valueRenderer: props.valueRenderer ?? ((value, input) => value),
        };

        return _.merge(defaults, props);
    }

    standardInputHandlers: ControlInputHandler[] = [
        {
            name: 'AddWithValue (builtin)',
            canHandle: this.isAddWithValue,
            handle: this.handleAddWithValue,
        },
        {
            name: 'RemoveWithValue (builtin)',
            canHandle: this.isRemoveWithValue,
            handle: this.handleRemoveWithValue,
        },
        {
            name: 'ClearValue (builtin)',
            canHandle: this.isClearValue,
            handle: this.handleClearValue,
        },
        {
            name: 'ConfirmationAffirmed (builtin)',
            canHandle: this.isConfirmationAffirmed,
            handle: this.handleConfirmationAffirmed,
        },
        {
            name: 'ConfirmationDisaffirmed (builtin)',
            canHandle: this.isConfirmationDisaffirmed,
            handle: this.handleConfirmationDisaffirmed,
        },
        {
            name: 'SelectChoiceByTouch (built-in)',
            canHandle: this.isSelectChoiceByTouch,
            handle: this.handleSelectChoiceByTouch,
        },
        {
            name: 'DeleteChoiceByTouch (built-in)',
            canHandle: this.isRemoveChoiceByTouch,
            handle: this.handleRemoveChoiceByTouch,
        },
        {
            name: 'SelectDoneByTouch (built-in)',
            canHandle: this.isSelectDoneByTouch,
            handle: this.handleSelectDoneByTouch,
        },
    ];
    // tsDoc - see Control
    async canHandle(input: ControlInput): Promise<boolean> {
        return evaluateInputHandlers(this, input);
    }

    // tsDoc - see Control
    async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        if (this.handleFunc === undefined) {
            log.error(
                'MultiValueListControl: handle called but no clause matched. are canHandle/handle out of sync?',
            );
            const intent: Intent = (input.request as IntentRequest).intent;
            throw new Error(`${intent.name} can not be handled by ${this.constructor.name}.`);
        }

        this.props.required = true;
        await this.handleFunc(input, resultBuilder);
        if (resultBuilder.hasInitiativeAct() !== true && (await this.canTakeInitiative(input)) === true) {
            await this.takeInitiative(input, resultBuilder);
        }
    }

    private isAddWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, ValueControlIntent.intentName(this.props.slotType)));
            const { feedback, action, target, values, valueType } = unpackValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueTypeMatch(valueType, this.getSlotTypes()));
            okIf(InputUtil.valueStrDefined(values));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, this.getFeedBackTypes()));
            okIf(InputUtil.actionIsMatchOrUndefined(action, this.props.interactionModel.actions.add));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private async handleAddWithValue(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        const slotValues = InputUtil.getMultiValueResolution(input);
        let values = this.getSlotValues(slotValues);
        const validationResult = await this.validate(values, input);
        const valueIds: string[] = [];

        if (validationResult !== true) {
            // filter out all invalid values
            values = values.filter((value) => !validationResult.invalidValues.includes(value.id));
        }
        values.forEach((value) => {
            valueIds.push(value.id);
            this.addValue(value);
        });

        if (valueIds.length > 0) {
            resultBuilder.addAct(
                new ValueAddedAct(this, {
                    value: valueIds,
                    renderedValue: this.evaluateRenderedValue(valueIds, input),
                }),
            );
        }

        if (validationResult !== true) {
            resultBuilder.addAct(
                new InvalidValueAct(this, {
                    value: validationResult.invalidValues,
                    renderedValue: this.evaluateRenderedValue(validationResult.invalidValues, input),
                    renderedReason: validationResult.renderedReason,
                }),
            );
        }
        return;
    }

    private isRemoveWithValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, ValueControlIntent.intentName(this.props.slotType)));
            const { feedback, action, target, values, valueType } = unpackValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.valueTypeMatch(valueType, this.getSlotTypes()));
            okIf(InputUtil.valueStrDefined(values));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, this.getFeedBackTypes()));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.remove));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleRemoveWithValue(input: ControlInput, resultBuilder: ControlResultBuilder) {
        const slotValues = InputUtil.getMultiValueResolution(input);
        const valueIds = this.getSlotValues(slotValues);
        const deletedValues = [];
        let invalidValues: string[] = [];

        if (this.state.value === undefined) {
            invalidValues = valueIds.map(({ id }) => id);
            resultBuilder.addAct(
                new InvalidRemoveValueAct(this, {
                    value: invalidValues,
                    renderedValue: this.evaluateRenderedValue(invalidValues, input),
                }),
            );
            this.askElicitationQuestion(input, resultBuilder, $.Action.Remove);
            return;
        }

        for (const value of valueIds) {
            const removeIndex = this.state.value.map((stateValue) => stateValue.id).indexOf(value.id);
            if (removeIndex === -1) {
                invalidValues.push(value.id);
            } else {
                deletedValues.push(value.id);
                this.state.value.splice(removeIndex, 1);
            }
        }

        if (deletedValues.length > 0) {
            resultBuilder.addAct(
                new ValueRemovedAct(this, {
                    value: deletedValues,
                    renderedValue: this.evaluateRenderedValue(deletedValues, input),
                }),
            );
        }

        if (invalidValues.length > 0) {
            resultBuilder.addAct(
                new InvalidRemoveValueAct(this, {
                    value: invalidValues,
                    renderedValue: this.evaluateRenderedValue(invalidValues, input),
                }),
            );
            this.askElicitationQuestion(input, resultBuilder, $.Action.Remove);
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

    private handleConfirmationAffirmed(input: ControlInput, resultBuilder: ControlResultBuilder) {
        const valueIds = this.state.lastInitiative.valueIds;
        if (valueIds !== undefined) {
            this.state.lastInitiative.actName = undefined;
            this.state.lastInitiative.valueIds = undefined;
            this.state.confirmed = true;
            resultBuilder.addAct(
                new ValueConfirmedAct(this, {
                    value: valueIds,
                    renderedValue: this.evaluateRenderedValue(valueIds, input),
                }),
            );
        }
        return;
    }

    private isConfirmationDisaffirmed(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isBareNo(input));
            okIf(this.state.lastInitiative.actName === ConfirmValueAct.name);
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleConfirmationDisaffirmed(input: ControlInput, resultBuilder: ControlResultBuilder) {
        resultBuilder.addAct(new SuggestActionAct(this, {}));
        this.state.lastInitiative.actName = undefined;
        this.state.lastInitiative.valueIds = undefined;
        return;
    }

    private isSelectChoiceByTouch(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isAPLUserEventWithMatchingControlId(input, this.id));
            const userEvent = input.request as interfaces.alexa.presentation.apl.UserEvent;
            const content = this.getChoicesList(input);
            okIf(userEvent.arguments !== undefined);
            okIf(userEvent.arguments.length === 3);
            const controlId = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![0] as string;
            const touchAction = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![1] as string;
            const choiceIndex = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![2] as number;
            okIf(controlId === this.id);
            okIf(['Select', 'Toggle'].includes(touchAction));
            okIf(choiceIndex >= -1 && choiceIndex <= content.length);
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleSelectChoiceByTouch(input: ControlInput, resultBuilder: ControlResultBuilder) {
        // The SendEvent provides arguments: [controlId, action, choiceIndex]
        const choiceIndex = (input.request as interfaces.alexa.presentation.apl.UserEvent).arguments![2];
        assert(choiceIndex !== undefined);
        const content = this.getChoicesList(input);
        const choiceId = content[choiceIndex - 1];
        const touchAction = (input.request as interfaces.alexa.presentation.apl.UserEvent)
            .arguments![1] as string;

        if (touchAction === 'Select') {
            return this.addItem(choiceId, input, resultBuilder);
        } else if (touchAction === 'Toggle') {
            return this.toggleItemChoiceSelection(choiceId, input, resultBuilder);
        }
        return;
    }

    private addItem(choiceId: string, input: ControlInput, resultBuilder: ControlResultBuilder) {
        this.addValue({
            id: choiceId,
            erMatch: true,
        });
        resultBuilder.addAct(
            new ValueAddedAct(this, {
                value: choiceId,
                renderedValue: this.evaluateRenderedValue(choiceId, input),
            }),
        );
    }

    private toggleItemChoiceSelection(
        choiceId: string,
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ) {
        if (!this.state.value.some((x) => x.id === choiceId)) {
            this.addItem(choiceId, input, resultBuilder);
        } else {
            this.state.value = this.state.value.filter((x) => x.id !== choiceId);

            resultBuilder.addAct(
                new ValueRemovedAct(this, {
                    value: choiceId,
                    renderedValue: this.evaluateRenderedValue(choiceId, input),
                }),
            );
        }
    }

    private isRemoveChoiceByTouch(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isAPLUserEventWithMatchingControlId(input, this.id));
            const userEvent = input.request as interfaces.alexa.presentation.apl.UserEvent;
            okIf(userEvent.arguments !== undefined);
            okIf(userEvent.arguments.length === 3);
            const controlId = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![0] as string;
            const touchAction = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![1] as string;
            okIf(controlId === this.id);
            okIf(['Remove', 'Reduce'].includes(touchAction));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleRemoveChoiceByTouch(input: ControlInput, resultBuilder: ControlResultBuilder) {
        const choiceIndex = (input.request as interfaces.alexa.presentation.apl.UserEvent)
            .arguments![2] as number;
        assert(choiceIndex !== undefined);
        const touchAction = (input.request as interfaces.alexa.presentation.apl.UserEvent)
            .arguments![1] as string;
        if (touchAction === 'Remove') {
            this.removeItem(choiceIndex, input, resultBuilder);
        } else if (touchAction === 'Reduce') {
            this.decrementItemCount(choiceIndex, input, resultBuilder);
        } else {
            throw new Error('Invalid touchAction from Ordinal to remove items');
        }
        return;
    }

    private removeItem(choiceIndex: number, input: ControlInput, resultBuilder: ControlResultBuilder) {
        const content = this.getSlotIds();
        const choiceId = content[choiceIndex - 1];
        this.state.value?.splice(choiceIndex - 1, 1);
        resultBuilder.addAct(
            new ValueRemovedAct(this, {
                value: choiceId,
                renderedValue: this.evaluateRenderedValue(choiceId, input),
            }),
        );
    }

    private decrementItemCount(
        choiceIndex: number,
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ) {
        const aggregateValues: { [key: string]: any } = {};
        const content = this.getSlotIds();
        const selections = this.getChoicesList(input);

        selections.forEach((x) => {
            aggregateValues[x] = (aggregateValues[x] ?? 0) + 1;
        });

        const choiceId = Array.from(Object.keys(aggregateValues))[choiceIndex - 1] as string;
        const removeIndex = content.indexOf(choiceId);
        this.state.value?.splice(removeIndex, 1);

        resultBuilder.addAct(
            new ValueRemovedAct(this, {
                value: choiceId,
                renderedValue: this.evaluateRenderedValue(choiceId, input),
            }),
        );
    }

    private isClearValue(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, GeneralControlIntent.name));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, this.getFeedBackTypes()));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.clear));
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleClearValue(input: ControlInput, resultBuilder: ControlResultBuilder) {
        const value = this.getSlotIds();
        this.clear();
        resultBuilder.addAct(
            new ValueClearedAct(this, {
                value,
                renderedValue: this.evaluateRenderedValue(value, input),
            }),
        );
        return;
    }

    private isSelectDoneByTouch(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isAPLUserEventWithMatchingControlId(input, this.id));
            const userEvent = input.request as interfaces.alexa.presentation.apl.UserEvent;
            okIf(userEvent.arguments !== undefined);
            okIf(userEvent.arguments.length === 2);
            const controlId = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![0] as string;
            const action = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![1] as string;
            okIf(controlId === this.id);
            okIf(action === 'Complete');
            return true;
        } catch (e) {
            return falseIfGuardFailed(e);
        }
    }

    private handleSelectDoneByTouch(input: ControlInput, resultBuilder: ControlResultBuilder) {
        this.state.lastInitiative.actName = undefined;
        this.state.lastInitiative.valueIds = undefined;
        this.state.confirmed = true;
        return;
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
        this.state.value = [];
        this.state.confirmed = false;
    }

    standardInitiativeHandlers: ControlInitiativeHandler[] = [
        {
            name: 'std::confirmValue',
            canTakeInitiative: this.wantsToConfirmValue,
            takeInitiative: this.confirmValue,
        },
        {
            name: 'std:elicitValue',
            canTakeInitiative: this.wantsToElicitValue,
            takeInitiative: this.elicitValue,
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
            log.error(
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
    public async takeInitiative(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        if (this.initiativeFunc === undefined) {
            const errorMsg =
                'MultiValueListControl: takeInitiative called but this.initiativeFunc is not set. canTakeInitiative() should be called first to set this.initiativeFunc.';
            log.error(errorMsg);
            throw new Error(errorMsg);
        }
        await this.initiativeFunc(input, resultBuilder);
        return;
    }

    private wantsToConfirmValue(input: ControlInput): boolean {
        if (
            this.evaluateBooleanProp(this.props.confirmationRequired, input) &&
            this.state.value !== undefined &&
            this.state.value.length !== 0 &&
            this.state.confirmed !== true
        ) {
            return true;
        }
        return false;
    }

    private confirmValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const valueIds = this.getSlotIds();
        this.state.lastInitiative = {
            valueIds,
            actName: ConfirmValueAct.name,
        };
        resultBuilder.addAct(
            new ConfirmValueAct(this, {
                value: valueIds,
                renderedValue: this.evaluateRenderedValue(valueIds, input),
            }),
        );
    }

    private wantsToElicitValue(input: ControlInput): boolean {
        if (
            (this.state.value === undefined ||
                (this.state.value !== undefined && this.state.value.length === 0)) &&
            this.evaluateBooleanProp(this.props.required, input)
        ) {
            return true;
        }
        return false;
    }

    private elicitValue(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        this.askElicitationQuestion(input, resultBuilder, $.Action.Add);
    }

    private async validate(values: MultiValueListStateValue[], input: ControlInput) {
        const listOfValidationFunc: SlotValidationFunction[] =
            typeof this.props.validation === 'function' ? [this.props.validation] : this.props.validation;
        for (const validationFunction of listOfValidationFunc) {
            const validationResult: true | MultiValueValidationFailure = await validationFunction(
                values,
                input,
            );
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
            case $.Action.Add:
                resultBuilder.addAct(
                    new RequestValueByListAct(this, {
                        choicesFromActivePage,
                        allChoices,
                        renderedChoicesFromActivePage: this.props.valueRenderer(choicesFromActivePage, input),
                        renderedAllChoices: this.props.valueRenderer(allChoices, input),
                    }),
                );
                return;
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
        let text = this.state.value.length > 0 ? this.state.value.join(', ') : '<none>';
        if (this.state.elicitationAction !== undefined) {
            text += `[eliciting, ${this.state.elicitationAction}]`;
        }
        return text;
    }

    public getChoicesList(input: ControlInput): string[] {
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
    async renderAct(act: SystemAct, input: ControlInput, builder: ControlResponseBuilder): Promise<void> {
        if (act instanceof RequestValueByListAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.requestValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.requestValue, input),
            );
        } else if (act instanceof RequestRemovedValueByListAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.requestRemovedValue, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.requestRemovedValue, input),
            );
        } else if (act instanceof InvalidValueAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.invalidValue, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.invalidValue, input),
            );
        } else if (act instanceof InvalidRemoveValueAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.invalidRemoveValue, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.invalidRemoveValue, input),
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
        } else if (act instanceof SuggestActionAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.suggestAction, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.suggestAction, input),
            );
        } else if (act instanceof ValueConfirmedAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.valueConfirmed, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.valueConfirmed, input),
            );
        } else {
            this.throwUnhandledActError(act);
        }

        if (builder.aplMode === APLMode.DIRECT) {
            this.addStandardAPL(input, builder); // re-render APL Screen
        }
    }

    async renderAPLComponent(
        input: ControlInput,
        resultBuilder: ControlResponseBuilder,
    ): Promise<{ [key: string]: any }> {
        const aplRenderFunc = this.props.apl.renderComponent;
        const defaultProps: MultiValueListAPLComponentProps = {
            valueRenderer: this.props.valueRenderer,
        };
        return aplRenderFunc.call(this, this, defaultProps, input, resultBuilder);
    }

    // tsDoc - see Control
    updateInteractionModel(generator: ControlInteractionModelGenerator, imData: ModelData) {
        generator.addControlIntent(new GeneralControlIntent(), imData);

        if (this.props.slotType !== 'dummy') {
            generator.addControlIntent(
                new ValueControlIntent(
                    this.props.slotType,
                    this.props.interactionModel.slotValueConflictExtensions.filteredSlotType,
                ),
                imData,
            );
        }
        generator.addYesAndNoIntents();

        generator.ensureSlotIsDefined(this.id, this.props.slotType);
        generator.ensureSlotIsNoneOrDefined(
            this.id,
            this.props.interactionModel.slotValueConflictExtensions.filteredSlotType,
        );

        for (const [, actionSlotIds] of Object.entries(this.props.interactionModel.actions)) {
            generator.ensureSlotValueIDsAreDefined(this.id, 'action', actionSlotIds);
        }

        generator.ensureSlotValueIDsAreDefined(this.id, 'target', this.props.interactionModel.targets);
    }

    // tsDoc - see InteractionModelContributor
    getTargetIds() {
        return this.props.interactionModel.targets;
    }

    private evaluateRenderedValue(value: StringOrList, input: ControlInput): string {
        const renderedValue = Array.isArray(value) ? value : [value];
        return ListFormatting.format(this.props.valueRenderer(renderedValue, input), 'and');
    }

    public getSlotIds(): string[] {
        if (this.state.value !== undefined) {
            return this.state.value.map(({ id }) => id);
        }
        return [];
    }

    private getSlotTypes(): string[] {
        return [
            this.props.slotType,
            this.props.interactionModel.slotValueConflictExtensions.filteredSlotType,
        ];
    }

    private getFeedBackTypes(): string[] {
        return [$.Feedback.Affirm, $.Feedback.Disaffirm];
    }

    private getSlotValues(values: MultiValueSlot[]): MultiValueListStateValue[] {
        const valueIds: MultiValueListStateValue[] = [];
        values.forEach((value) => {
            valueIds.push({
                id: value.slotValue as string,
                erMatch: value.isEntityResolutionMatch as boolean,
            });
        });
        return valueIds;
    }

    private evaluateAPLPropNewStyle(prop: AplDocumentPropNewStyle, input: ControlInput): AplContent {
        return typeof prop === 'function' ? (prop as AplContentFunc).call(this, this, input) : prop;
    }

    private addStandardAPL(input: ControlInput, builder: ControlResponseBuilder) {
        if (
            this.evaluateBooleanProp(this.props.apl.enabled, input) === true &&
            getSupportedInterfaces(input.handlerInput.requestEnvelope)['Alexa.Presentation.APL']
        ) {
            const renderedAPL = this.evaluateAPLPropNewStyle(this.props.apl.requestValue, input);
            builder.addAPLRenderDocumentDirective(this.id, renderedAPL.document, renderedAPL.dataSource);
        }
    }
}
