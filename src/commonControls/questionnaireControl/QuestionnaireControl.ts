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
import { evaluateValidationProp, StateValidationFunction } from '../../controls/Validation';
import { GeneralControlIntent, unpackGeneralControlIntent } from '../../intents/GeneralControlIntent';
import {
    SingleValueControlIntent,
    unpackSingleValueControlIntent,
} from '../../intents/SingleValueControlIntent';
import { ControlInteractionModelGenerator } from '../../interactionModelGeneration/ControlInteractionModelGenerator';
import { ModelData } from '../../interactionModelGeneration/ModelTypes';
import { Logger } from '../../logging/Logger';
import { ControlResponseBuilder } from '../../responseGeneration/ControlResponseBuilder';
import { ActiveAPLInitiativeAct } from '../../systemActs/InitiativeActs';
import { SystemAct } from '../../systemActs/SystemAct';
import { assert } from '../../utils/AssertionUtils';
import { StringOrList } from '../../utils/BasicTypes';
import { DeepRequired } from '../../utils/DeepRequired';
import { InputUtil } from '../../utils/InputUtil';
import { defaultIntentToValueMapper } from '../../utils/IntentUtils';
import { failIf, okIf, verifyErrorIsGuardFailure } from '../../utils/Predicates';
import { QuestionnaireControlAPLPropsBuiltIns } from './QuestionnaireControlBuiltIns';
import { Question, QuestionnaireContent } from './QuestionnaireControlStructs';
import {
    AcknowledgeNotCompleteAct,
    AskIfCompleteAct,
    AskIfCompleteTerseAct,
    AskQuestionAct,
    CompletedAct,
    QuestionAnsweredAct,
    QuestionnaireCompletionRejectedAct,
} from './QuestionnaireControlSystemActs';

// TODO: robust spec & solution for 'invalid' answers
// -- is seems important to support 'needs all answers' vs 'any answers is ok'. and
// why not be general?
// -- a label needs to be present on APL.
// -- if APL button is pressed it needs to round-trip so that the screen updates.
// -- validation logic runs server-side.

// TODO: experiment with updateData / updateDynamicList rather than pushing whole new
// document.  --- can we just push the dataSource again?

//TODO: Not handled yet: providing a value & feedback of affirm/disaffirm that are not in sync.
//TODO: Not tested yet: feedback values other than affirm/disaffirm
//TODO: review tsDocs
//TODO: test flows on headless.

/**
 * Future feature idea:
 *  - pre-configured yes/no questionnaireControl
 *  - pre-configured yes/no/maybe questionnaireControl
 *  - pre-configured Likert questionnaireControl (1-5 scale)
 */

const log = new Logger('AskSdkControls:QuestionnaireControl');

/**
 * Props for a QuestionnaireControl.
 */
export interface QuestionnaireControlProps extends ControlProps {
    /**
     * Unique identifier for control instance
     */
    id: string;

    /**
     * Content for the questionnaire.
     */
    questionnaireData:
        | QuestionnaireContent
        | ((control: QuestionnaireControl, input: ControlInput) => QuestionnaireContent);

    /**
     * Determines if the Control must obtain a value.
     *
     * If `true`:
     *  - the Control report isReady() = false if no value has been obtained.
     *  - the control will take the initiative when given the opportunity.
     */
    required?: boolean | ((control: QuestionnaireControl, input: ControlInput) => boolean);

    /**
     * Determine if the questionnaire is considered valid, i.e. has no input errors and
     * is considered 'sufficiently complete' for the purposes of the Skill.
     *
     * Default: `true`, i.e. no validation and user can 'be done' whenever they wish.
     *
     * Usage:
     * - Validation functions return either `true` or a `ValidationResult` to
     *   describe what validation failed.
     */
    valid?: StateValidationFunction<QuestionnaireControlState>;

    /**
     * Props to customize the relationship between the control and the
     * interaction model.
     */
    interactionModel?: QuestionnaireControlInteractionModelProps;

    /**
     * Props to configure input handling.
     */
    inputHandling?: QuestionnaireControlInputHandlingProps;

    /**
     * Props to configure dialog policy.
     */
    dialog?: {
        confirmationRequired?: boolean | ((control: QuestionnaireControl, input: ControlInput) => boolean);
    };

    /**
     * Props to customize the prompt fragments that will be added by
     * `this.renderAct()`.
     */
    prompts?: QuestionnaireControlPromptProps;

    /**
     * Props to customize the reprompt fragments that will be added by
     * `this.renderAct()`.
     */
    reprompts?: QuestionnaireControlPromptProps;

    /**
     * Props to customize the APL generated by this control.
     */
    apl?: QuestionnaireControlAPLProps;
}

/**
 * Mapping of action slot values to the behaviors that this control supports.
 *
 * Behavior:
 * - This control will not handle an input if the action-slot is filled with an
 *   value whose ID is not associated with a capability.
 */
export interface QuestionnaireControlActionProps {
    /**
     * Action slot value IDs that are associated with the "start/open/resume the questionnaire" capability.
     *
     * Default: ['builtin_start', 'builtin_resume']
     */
    activate?: string[];

    /**
     * Action slot value IDs that are associated with the "complete questionnaire" capability.
     *
     * Default ['builtin_complete']
     */
    complete?: string[];

    /**
     * Action slot value IDs that are associated with the "answer a question" capability.
     *
     * Default ['builtin_answer', 'builtin_select']
     */
    answer?: string[];
}

/**
 * Props associated with the interaction model.
 */
export class QuestionnaireControlInteractionModelProps {
    /**
     * Target-slot values associated with this Control as a whole.
     *
     * These targets are used to associate utterances to 'the questionnaire' as a whole.
     * For example, if the user says "open the questionnaire", it will be parsed as a
     * `GeneralControlIntent` with slot values `action = open` and `target = questionnaire`.
     *
     * Default: `['builtin_it', 'builtin_questionnaire']`
     *
     * Usage:
     * - If this prop is defined, it replaces the default; it is not additive to the
     *   defaults.  To add an additional target to the defaults, copy the defaults and
     *   amend.
     * - A control can be associated with many targets, eg ['questionnaire',
     *   'customerServiceFeedback', 'feedback']
     * - It is a good idea to associate with general targets (e.g. feedback) and also with
     *   specific targets (e.g. customerServiceFeedback) so that the user can say either
     *   general or specific things.
     * - The association does not have to be exclusive, and general target slot values
     *   will often be associated with many controls. In situations where there is
     *   ambiguity about what the user is referring to, the parent controls must resolve
     *   the confusion.
     * - The 'builtin_*' IDs are associated with default interaction model data (which can
     *   be extended as desired). Any other IDs will require a full definition of the
     *   allowed synonyms to be added to the interaction model.
     *
     * Control behavior:
     * - The control will not handle an input that mentions a target that is not defined
     *   by this prop.
     */
    targets?: string[];

    /**
     * All target slots that are used by individual questions.
     *
     * Default: []
     *
     * Purpose:
     *  - the user may give an answer to a specific question, e.g. "I like cats" which is
     *    parsed as a SingleValueControlIntent with value=like target=cats.  To achieve
     *    this, the slotType associated with this control must include the value 'like'
     *    and the targets slotType must include 'cats'.
     *
     * Why can't the targets be pulled from questionnaire content?
     *  - because the questionnaire content is dynamic at runtime, but the complete list
     *    of targets must be known at build time.
     *
     * Control behavior:
     * - at build time, all the targets listed here will be verified to exist in the
     *   interaction model.
     */
    allQuestionTargets?: string[];

    /**
     * Action slot-values associated to the capabilities of the control as a whole
     *
     * Default:
     * ```
     * {
     *    activate: ['builtin_start', 'builtin_resume'],
     *    complete: ['builtin_complete']
     * }
     * ```
     *
     * Action slot-values associate utterances to a control. For example, if the user says
     * "change the time", it is parsed as a `GeneralControlIntent` with slot values
     * `action = change` and `target = time`.  Only controls that are registered with the
     * `change` action should offer to handle this intent.
     *
     * Usage:
     *  - This allows users to refer to an action using more domain-appropriate words. For
     *    example, a user might like to say 'show two items' rather that 'set item count
     *    to two'.  To achieve this, include the slot-value-id 'show' in the list
     *    associated with the 'set' capability and ensure the interaction-model includes
     *    an action slot value with id=show and appropriate synonyms.
     *  - The 'builtin_*' IDs are associated with default interaction model data (which
     *    can be extended as desired). Any other IDs will require a full definition of the
     *    allowed synonyms in the interaction model.
     */
    actions?: QuestionnaireControlActionProps;

    /**
     * Slot type that includes entries for the answers provided by the questionnaire.
     *
     * Default: none
     *
     * If the questions are not strictly yes/no, `slotType` provides the values that the
     * user can say.  Every legal answer should be present in `slotType` and all legal
     * answers *that are not in conflict with other sample utterances* should be present
     * in `filteredSlotType`.
     *
     * Example:
     *
     * If the questionnaire answers are "yes", "no" and "maybe", the `slotType`
     * should have values for all three and the `filteredSlotType` should only have "maybe".
     * ```
     * interactionModel: {
     *   slotType: 'YesNoMaybe',
     *   filteredSlotType: 'Maybe'
     * }
     * ```
     */
    slotType?: string;

    /**
     * Slot type that includes entries for the answers that do not conflict with
     * the sample utterances of built-in intents or custom intents.
     *
     * Default: identical to `slotType`.
     *
     * Purpose:
     * - During interaction-model-generation the `filteredSlotType` is used
     *   in sample-utterances that would cause conflicts if the regular
     *   slotType was used.
     * - If utterance conflicts persist the skill will not receive the built-in intent
     *   which may break other interactions.
     *
     * Example:
     *
     * If the questionnaire answers are "yes", "no" and "maybe", the `slotType`
     * should have values for all three and `filteredSlotType` should only have "maybe".
     * ```
     * interactionModel: {
     *   slotType: 'YesNoMaybe',
     *   filteredSlotType: 'Maybe'
     * }
     * ```
     */
    filteredSlotType?: string;

    // TODO: make the prop design consistent with ListControl
    // TODO: make this jsDoc consistent with ListControl
}

export interface QuestionnaireControlInputHandlingProps extends ControlInputHandlingProps {
    /**
     * Function that maps an intent to a choice ID defined in for props.slotValue.
     *
     * Default: `IntentUtils.defaultIntentToValueMapper` which converts "AMAZON.YesIntent"
     * to 'yes' and so on.  Generally,  `(.+)*<Value>Intent" -> 'value'`.
     *
     * Purpose:
     * * Some simple utterances intended for this control will be interpreted as intents
     *   that are unknown to this control.  This function allows them to be recognized as
     *   answers.
     * * Whenever the questionnaire has asked a direct question to the user, e.g. "A: do
     *   you like cats?" the subsequent intents will be tested using this function. If it
     *   produces a valid answer id the input will be considered an answer to the question.
     *
     * Example:
     * * Assume `slotType: 'YesNoMaybe'` and `filteredSlotType = 'Maybe'`. An utterance of
     *    'U: yes' will be interpreted as an `AMAZON.YesIntent`.  To ensure that intent
     *    can be interpreted as the 'yes' answer to a questionnaire question an
     *    intentToChoiceMapper must be defined.  The default is sufficient for this case
     *    and for most cases that involve intents with conventional naming.
     */
    intentToChoiceMapper: (intent: Intent) => string | undefined;

    //jsDocs on ControlInputHandlingProps
    customHandlingFuncs?: ControlInputHandler[];
}

/**
 * Props to customize the prompt fragments that will be added by
 * `this.renderAct()`.
 */
export class QuestionnaireControlPromptProps {
    askQuestionAct?: StringOrList | ((act: AskQuestionAct, input: ControlInput) => StringOrList);
    questionAnsweredAct?: StringOrList | ((act: QuestionAnsweredAct, input: ControlInput) => StringOrList);

    questionnaireCompleted?: StringOrList | ((act: CompletedAct, input: ControlInput) => StringOrList);

    questionnaireCompletionRejected?:
        | StringOrList
        | ((act: QuestionnaireCompletionRejectedAct, input: ControlInput) => StringOrList);

    acknowledgeNotCompleteAct?:
        | StringOrList
        | ((act: QuestionnaireCompletionRejectedAct, input: ControlInput) => StringOrList);

    askIfComplete?: StringOrList | ((act: AskIfCompleteAct, input: ControlInput) => StringOrList);

    askIfCompleteTerse?: StringOrList | ((act: AskIfCompleteTerseAct, input: ControlInput) => StringOrList);
}

//TODO: centralize these types.
export type AplContent = { document: any; dataSource: any };
export type AplContentFunc = (control: QuestionnaireControl, input: ControlInput) => AplContent;
export type AplDocumentPropNewStyle = AplContent | AplContentFunc;

/**
 * Props associated with the APL produced by QuestionnaireControl.
 */
export class QuestionnaireControlAPLProps {
    /**
     * Determines if APL should be produced.
     *
     * Default: true
     */
    enabled?: boolean | ((input: ControlInput) => boolean);

    /**
     * Custom APL to show all questions while asking one in particular.
     */
    askQuestion: AplDocumentPropNewStyle;
}

export type QuestionnaireUserAnswers = {
    [index: string]: {
        choiceId: string;
    };
};

/**
 * State tracked by a QuestionnaireControl.
 */
export class QuestionnaireControlState implements ControlState {
    /**
     * The answers as a map of (questionId, answerId) pairs.
     */
    value: QuestionnaireUserAnswers;

    /**
     * Tracks the most recent initiative action.
     */
    activeInitiative?: {
        actName: string;
        //other things related to the act? but probably should just be tracked as regular
        //state variables.
        //(note that SystemActs are not good state variables.. they are programming model
        //helpers to pass information to render() functions.)
    };

    /**
     * Which questionId is active, aka in focus.
     */
    focusQuestionId?: string;

    /**
     * Whether the user has explicitly completed the questionnaire.
     */
    userExplicitlyCompleted: boolean;

    /**
     * Whether the user has been ask if they are done and replied 'no'.
     */
    userDisconfirmedCompletion: boolean;

    /**
     * Should we require an explicit completion.
     * (e.g. after rejecting are you done, or re-activating the control)
     */
    requiresExplicitCompletion: boolean;
}

/**
 * A Control that asks a series of questions, where each question has the same
 * answer-options.
 *
 * Capabilities:
 * - Activate the questionnaire. "I'd like to answer the personality questionnaire"
 * - Answer a question directly. "Yes I have headache" // "yes to question three"
 * - Bring a question in to focus. "U: skip to headache" // "U: move to question ten"
 * - Confirm an answer
 * - Show the entire questionnaire on APL enabled devices (with interactivity)
 */
export class QuestionnaireControl extends Control implements InteractionModelContributor {
    state: QuestionnaireControlState = new QuestionnaireControlState();
    inputWasAnswerByTouch: boolean = false;
    activatedThisTurn: boolean = false;

    private rawProps: QuestionnaireControlProps;
    props: DeepRequired<QuestionnaireControlProps>;

    private handleFunc?: (input: ControlInput, resultBuilder: ControlResultBuilder) => void | Promise<void>;
    private initiativeFunc?: (
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ) => void | Promise<void>;

    constructor(props: QuestionnaireControlProps) {
        super(props.id);
        this.rawProps = props;
        this.props = QuestionnaireControl.mergeWithDefaultProps(props);
        if (this.props.interactionModel.filteredSlotType === 'dummy') {
            this.props.interactionModel.filteredSlotType = this.props.interactionModel.slotType;
        }
        this.state.value = {};
    }

    /**
     * Merges the user-provided props with the default props.
     *
     * Any property defined by the user-provided data overrides the defaults.
     */
    static mergeWithDefaultProps(props: QuestionnaireControlProps): DeepRequired<QuestionnaireControlProps> {
        const defaults: DeepRequired<QuestionnaireControlProps> = {
            id: 'dummy',
            questionnaireData: {
                questions: [],
                choices: [],
            },
            required: true,
            valid: () => true, //TODO: also implement a builtin for "all questions must be answered".

            interactionModel: {
                slotType: 'dummy',
                filteredSlotType: 'dummy',
                targets: [$.Target.It, $.Target.Questionnaire],
                allQuestionTargets: [],
                actions: {
                    activate: [$.Action.Start, $.Action.Resume],
                    complete: [$.Action.Complete],
                    answer: [$.Action.Set, $.Action.Select],
                },
            },

            dialog: {
                confirmationRequired: false,
            },

            // questionRenderer: (id: string) => id,
            // choiceRenderer: (id: string) => id,
            prompts: {
                askQuestionAct: (act: AskQuestionAct, input: ControlInput) =>
                    act.control.evaluatePromptProp(
                        act,
                        act.control.getQuestionContentById(act.payload.questionId, input).prompt,
                        input,
                    ),

                questionAnsweredAct: (act: QuestionAnsweredAct, input: ControlInput) => {
                    if (!act.payload.userAnsweredWithExplicitValue && !act.payload.userMentionedQuestion) {
                        return i18next.t(
                            'QUESTIONNAIRE_CONTROL_DEFAULT_PROMPT_QUESTION_ANSWERED_LOW_RISK_OF_MISUNDERSTANDING',
                        );
                    } else if (
                        act.payload.userAnsweredWithExplicitValue &&
                        !act.payload.userMentionedQuestion
                    ) {
                        return i18next.t(
                            'QUESTIONNAIRE_CONTROL_DEFAULT_PROMPT_QUESTION_ANSWERED_RISK_OF_MISUNDERSTANDING_CHOICE',
                            { choice: act.payload.renderedChoice },
                        );
                    } else {
                        return i18next.t(
                            'QUESTIONNAIRE_CONTROL_DEFAULT_PROMPT_QUESTION_ANSWERED_RISK_OF_MISUNDERSTANDING_QUESTION_AND_CHOICE',
                            {
                                choice: act.payload.renderedChoice,
                                question: act.payload.renderedQuestionShortForm,
                            },
                        );
                    }
                },
                questionnaireCompleted: i18next.t('QUESTIONNAIRE_CONTROL_DEFAULT_PROMPT_COMPLETED'),
                questionnaireCompletionRejected: (
                    act: QuestionnaireCompletionRejectedAct,
                    input: ControlInput,
                ) =>
                    i18next.t('QUESTIONNAIRE_CONTROL_DEFAULT_PROMPT_COMPLETION_REJECTED', {
                        reason: act.payload.renderedReason,
                    }),
                acknowledgeNotCompleteAct: i18next.t(
                    'QUESTIONNAIRE_CONTROL_DEFAULT_PROMPT_ACKNOWLEDGE_NOT_COMPLETE',
                ),
                askIfComplete: i18next.t('QUESTIONNAIRE_CONTROL_DEFAULT_PROMPT_ASK_IF_COMPLETE'),
                askIfCompleteTerse: i18next.t('QUESTIONNAIRE_CONTROL_DEFAULT_PROMPT_ASK_IF_COMPLETE_TERSE'),
            },
            reprompts: {
                askQuestionAct: (act: AskQuestionAct, input: ControlInput) =>
                    act.control.evaluatePromptProp(
                        act,
                        act.control.getQuestionContentById(act.payload.questionId, input).prompt,
                        input,
                    ),

                questionAnsweredAct: (act: QuestionAnsweredAct, input: ControlInput) => {
                    if (!act.payload.userAnsweredWithExplicitValue && !act.payload.userMentionedQuestion) {
                        return i18next.t(
                            'QUESTIONNAIRE_CONTROL_DEFAULT_REPROMPT_QUESTION_ANSWERED_LOW_RISK_OF_MISUNDERSTANDING',
                        );
                    } else if (
                        act.payload.userAnsweredWithExplicitValue &&
                        !act.payload.userMentionedQuestion
                    ) {
                        return i18next.t(
                            'QUESTIONNAIRE_CONTROL_DEFAULT_REPROMPT_QUESTION_ANSWERED_RISK_OF_MISUNDERSTANDING_CHOICE',
                            { choice: act.payload.renderedChoice },
                        );
                    } else {
                        return i18next.t(
                            'QUESTIONNAIRE_CONTROL_DEFAULT_REPROMPT_QUESTION_ANSWERED_RISK_OF_MISUNDERSTANDING_QUESTION_AND_CHOICE',
                            {
                                choice: act.payload.renderedChoice,
                                question: act.payload.renderedQuestionShortForm,
                            },
                        );
                    }
                },
                questionnaireCompleted: i18next.t('QUESTIONNAIRE_CONTROL_DEFAULT_REPROMPT_COMPLETED'),
                questionnaireCompletionRejected: (
                    act: QuestionnaireCompletionRejectedAct,
                    input: ControlInput,
                ) =>
                    i18next.t('QUESTIONNAIRE_CONTROL_DEFAULT_REPROMPT_COMPLETION_REJECTED', {
                        reason: act.payload.renderedReason,
                    }),
                acknowledgeNotCompleteAct: i18next.t(
                    'QUESTIONNAIRE_CONTROL_DEFAULT_REPROMPT_ACKNOWLEDGE_NOT_COMPLETE',
                ),
                askIfComplete: i18next.t('QUESTIONNAIRE_CONTROL_DEFAULT_REPROMPT_ASK_IF_COMPLETE'),
                askIfCompleteTerse: i18next.t('QUESTIONNAIRE_CONTROL_DEFAULT_REPROMPT_ASK_IF_COMPLETE_TERSE'),
            },
            apl: {
                enabled: true,
                askQuestion: QuestionnaireControlAPLPropsBuiltIns.defaultAskQuestion({
                    title: undefined, // the default is wired up in defaultAskQuestion()
                    submitButtonText: undefined, // the default is wired up in defaultAskQuestion()
                }),
            },
            inputHandling: {
                intentToChoiceMapper: (intent) => defaultIntentToValueMapper(intent),
                customHandlingFuncs: [],
            },
        };

        return _.merge(defaults, props);
    }

    standardInputHandlers: ControlInputHandler[] = [
        {
            name: 'Activate (builtin)',
            canHandle: this.isActivate,
            handle: this.handleActivate,
        },
        {
            // takes care of built-in Intents that match answer words, e.g. AMAZON.YesIntent/AMAZON.NoIntent
            name: 'MappedAnswerToAskedQuestion (builtin)',
            canHandle: this.isMappedAnswerToAskedQuestion,
            handle: this.handleMappedAnswerToAskedQuestion,
        },
        {
            // SingleValueControlIntents that provide answer (value slot)
            name: 'SpecificAnswerToAskedQuestion (builtin)',
            canHandle: this.isSpecificAnswerToAskedQuestion,
            handle: this.handleSpecificAnswerToAskedQuestion,
        },
        {
            // SingleValueControlIntents that mention question (target) and answer (value slot)
            name: 'SpecificAnswerToSpecificQuestion (builtin)',
            canHandle: this.isSpecificAnswerToSpecificQuestion,
            handle: this.handleSpecificAnswerToSpecificQuestion,
        },
        {
            // SingleValueControlIntents that mention question (target) and answer (feedback slot)
            name: 'FeedbackAnswerToSpecificQuestion (builtin)',
            canHandle: this.isFeedbackAnswerToSpecificQuestion,
            handle: this.handleFeedbackAnswerToSpecificQuestion,
        },
        {
            name: 'SpecificAnswerByTouch (builtin)',
            canHandle: this.isSpecificAnswerByTouch,
            handle: this.handleSpecificAnswerByTouch,
        },
        {
            name: 'CompletionRequestByVoice (builtin)',
            canHandle: this.isCompletionRequestByVoice,
            handle: this.handleCompletionRequest,
        },
        {
            name: 'CompletionRequestByTouch (builtin)',
            canHandle: this.isCompletionRequestByTouch,
            handle: this.handleCompletionRequest,
        },
        {
            name: 'BareYesToCompletionQuestion (builtin)',
            canHandle: this.isBareYesToCompletionQuestion,
            handle: this.handleCompletionRequest,
        },
        {
            name: 'BareNoToCompletionQuestion (builtin)',
            canHandle: this.isBareNoToCompletionQuestion,
            handle: this.handleBareNoToCompletionQuestion,
        },
    ];

    // tsDoc - see Control
    async canHandle(input: ControlInput): Promise<boolean> {
        const stdHandlers = this.standardInputHandlers;
        const customHandlers = this.props.inputHandling.customHandlingFuncs ?? [];

        const matches = [];
        for (const handler of stdHandlers.concat(customHandlers)) {
            if (await handler.canHandle.call(this, input)) {
                matches.push(handler);
            }
        }

        if (matches.length > 1) {
            log.error(
                `More than one handler matched. Handlers in a single control should be mutually exclusive. ` +
                    `Defaulting to the first. handlers: ${JSON.stringify(matches.map((x) => x.name))}`,
            );
        }

        if (matches.length >= 1) {
            this.handleFunc = matches[0].handle.bind(this);
            return true;
        } else {
            return false;
        }
    }

    // tsDoc - see Control
    async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        const content = this.getQuestionnaireContent(input);
        if (this.handleFunc === undefined) {
            log.error(
                'QuestionnaireControl: handle called but this.handlerFunc not set.  are canHandle/handle out of sync?',
            );
            throw new Error(`this.handlerFunc not set.  are canHandle/handle out of sync?`);
        }

        await this.handleFunc(input, resultBuilder);
        this.state.activeInitiative = undefined; // clear the initiative state so we don't get confused on subsequent turns.
    }

    private isActivate(input: ControlInput): any {
        try {
            okIf(InputUtil.isIntent(input, GeneralControlIntent.name));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.activate));
            this.handleFunc = this.handleActivate;
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    // TODO: extract from each handle-method a programmatic method that can be public.
    //  i.e. handling = extract data from input then call the business function.
    //  this is a safer way to let folks create custom handlers that extract data from
    //  different inputs.  the business functions are the 'functional capabilities'.
    //  Much less risk of folks screwing up the state variables and breaking things.
    //  We shouldn't let folks shoot themselves in the foot by forgetting to set/clear
    //  flags etc.

    private async handleActivate(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        if (!_.isEmpty(this.state.value)) {
            this.state.requiresExplicitCompletion = true;
        }
        this.activatedThisTurn = true;
        this.state.userExplicitlyCompleted = false; // user interacted with the and so the questionnaire should stick around
        return;
    }

    private isMappedAnswerToAskedQuestion(input: ControlInput): any {
        try {
            const content = this.getQuestionnaireContent(input);
            okIf(InputUtil.isIntent(input));
            okIf(this.state.activeInitiative?.actName === AskQuestionAct.name);
            okIf(this.state.focusQuestionId !== undefined);
            const intent = (input.request as IntentRequest).intent;
            const mappedValue = this.props.inputHandling.intentToChoiceMapper(intent);
            okIf(mappedValue !== undefined);
            okIf(this.getChoiceIndexById(content, mappedValue) !== undefined);
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private async handleMappedAnswerToAskedQuestion(
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): Promise<void> {
        const content = this.getQuestionnaireContent(input);
        const question = this.getQuestionContentById(this.state.focusQuestionId!, input);
        const intent = (input.request as IntentRequest).intent;
        const mappedValue = this.props.inputHandling.intentToChoiceMapper(intent)!;
        const choiceIndex = this.getChoiceIndexById(content, mappedValue);
        assert(choiceIndex !== undefined);
        const questionIndex = this.getQuestionIndexById(content, this.state.focusQuestionId!);
        this.updateAnswer(question.id, mappedValue!, input, resultBuilder);
        resultBuilder.addAct(
            new QuestionAnsweredAct(this, {
                questionId: question.id,
                choiceId: mappedValue,
                userAnsweredWithExplicitValue: false,
                userMentionedQuestion: false,
                renderedChoice: content.choices[choiceIndex].prompt,
                renderedQuestionShortForm: this.evaluatePromptShortForm(
                    content.questions[questionIndex].promptShortForm,
                    input,
                ),
            }),
        );

        this.addCompletionActIfImplicitlyComplete(input, resultBuilder);
        this.state.userExplicitlyCompleted = false; // user interacted with the and so the questionnaire should stick around
        return;
    }

    private isSpecificAnswerToAskedQuestion(input: ControlInput): boolean {
        try {
            okIf(this.state.focusQuestionId !== undefined);
            const question = this.getQuestionContentById(this.state.focusQuestionId, input);

            okIf(
                InputUtil.isIntent(
                    input,
                    SingleValueControlIntent.intentName(this.props.interactionModel.slotType),
                ),
            );
            const { feedback, action, target, valueStr, valueType } = unpackSingleValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsUndefined(target));
            okIf(InputUtil.valueTypeMatch(valueType, this.getSlotTypes()));
            okIf(InputUtil.valueStrDefined(valueStr));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatchOrUndefined(action, this.props.interactionModel.actions.answer));
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private handleSpecificAnswerToAskedQuestion(input: ControlInput, resultBuilder: ControlResultBuilder) {
        const content = this.getQuestionnaireContent(input);
        const question = this.getQuestionContentById(this.state.focusQuestionId!, input);

        const { feedback, action, target, valueStr, valueType, erMatch } = unpackSingleValueControlIntent(
            (input.request as IntentRequest).intent,
        );

        // Accept the answer if it is a match to one of the listed choices, otherwise
        // report error and ignore.  Note: being a match is a stronger condition than
        // simply being an ER_MATCH as the answer slot type might have more values than
        // answers for a particular questionnaire.

        if (content.choices.some((choice) => choice.id === valueStr)) {
            const choiceIndex = this.getChoiceIndexById(content, valueStr);
            assert(choiceIndex !== undefined);
            const questionIndex = this.getQuestionIndexById(content, this.state.focusQuestionId!);

            this.updateAnswer(question.id, valueStr, input, resultBuilder);

            resultBuilder.addAct(
                new QuestionAnsweredAct(this, {
                    questionId: question.id,
                    choiceId: valueStr,
                    userAnsweredWithExplicitValue: true,
                    userMentionedQuestion: false,
                    renderedChoice: content.choices[choiceIndex].prompt,
                    renderedQuestionShortForm: this.evaluatePromptShortForm(
                        content.questions[questionIndex].promptShortForm,
                        input,
                    ),
                }),
            );

            this.addCompletionActIfImplicitlyComplete(input, resultBuilder);
        } else {
            throw new Error('todo'); //TODO. handle case of a value that doesn't match a legal answer.
            //resultBuilder.addAct(new InvalidAnswerAct(this, {}));
        }
        this.state.userExplicitlyCompleted = false; // user interacted with the and so the questionnaire should stick around
        return;
    }

    // // handle the special case that the answer is captured by `feedback` item.
    private isFeedbackAnswerToSpecificQuestion(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, GeneralControlIntent.name));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            const content = this.getQuestionnaireContent(input);

            okIf(InputUtil.targetIsDefined(target));
            const targetedQuestion = content.questions.find((q) => q.targets.includes(target!));
            okIf(targetedQuestion !== undefined);

            okIf(InputUtil.feedbackIsDefined(feedback));
            okIf(content.choices.some((choice) => choice.id === feedback));
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private handleFeedbackAnswerToSpecificQuestion(input: ControlInput, resultBuilder: ControlResultBuilder) {
        const content = this.getQuestionnaireContent(input);

        const { feedback, action, target } = unpackGeneralControlIntent(
            (input.request as IntentRequest).intent,
        );

        assert(feedback !== undefined);
        const choiceIndex = this.getChoiceIndexById(content, feedback);
        assert(choiceIndex !== undefined);
        const targetedQuestion = content.questions.find((q) => q.targets.includes(target!));
        assert(targetedQuestion !== undefined);
        this.updateAnswer(targetedQuestion.id, feedback, input, resultBuilder);
        const questionIndex = this.getQuestionIndexById(content, targetedQuestion.id);

        resultBuilder.addAct(
            new QuestionAnsweredAct(this, {
                questionId: targetedQuestion.id,
                choiceId: feedback,
                userAnsweredWithExplicitValue: true,
                userMentionedQuestion: true,
                renderedChoice: content.choices[choiceIndex].prompt,
                renderedQuestionShortForm: this.evaluatePromptShortForm(
                    content.questions[questionIndex].promptShortForm,
                    input,
                ),
            }),
        );

        this.addCompletionActIfImplicitlyComplete(input, resultBuilder);

        this.state.userExplicitlyCompleted = false; // user interacted with the and so the questionnaire should stick around
        return;
    }

    private isSpecificAnswerToSpecificQuestion(input: ControlInput): boolean {
        try {
            okIf(
                InputUtil.isIntent(
                    input,
                    SingleValueControlIntent.intentName(this.props.interactionModel.slotType),
                ),
            );
            const { feedback, action, target, valueStr, valueType } = unpackSingleValueControlIntent(
                (input.request as IntentRequest).intent,
            );
            const content = this.getQuestionnaireContent(input);

            okIf(InputUtil.targetIsDefined(target));
            const targetedQuestion = content.questions.find((q) => q.targets.includes(target!));
            okIf(targetedQuestion !== undefined);

            okIf(InputUtil.valueTypeMatch(valueType, this.props.interactionModel.slotType));
            okIf(InputUtil.valueStrDefined(valueStr));
            okIf(content.choices.some((choice) => choice.id === valueStr));

            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatchOrUndefined(action, this.props.interactionModel.actions.answer));
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private handleSpecificAnswerToSpecificQuestion(input: ControlInput, resultBuilder: ControlResultBuilder) {
        const content = this.getQuestionnaireContent(input);

        const { feedback, action, target, valueStr, valueType } = unpackSingleValueControlIntent(
            (input.request as IntentRequest).intent,
        );

        const choiceIndex = this.getChoiceIndexById(content, valueStr);
        assert(choiceIndex !== undefined);
        const targetedQuestion = content.questions.find((q) => q.targets.includes(target!));
        assert(targetedQuestion !== undefined);
        this.updateAnswer(targetedQuestion.id, valueStr, input, resultBuilder);
        const questionIndex = this.getQuestionIndexById(content, targetedQuestion.id);
        resultBuilder.addAct(
            new QuestionAnsweredAct(this, {
                questionId: targetedQuestion.id,
                choiceId: valueStr,
                userAnsweredWithExplicitValue: true,
                userMentionedQuestion: true,
                renderedChoice: content.choices[choiceIndex].prompt,
                renderedQuestionShortForm: this.evaluatePromptShortForm(
                    content.questions[questionIndex].promptShortForm,
                    input,
                ),
            }),
        );

        this.addCompletionActIfImplicitlyComplete(input, resultBuilder);

        this.state.userExplicitlyCompleted = false; // user interacted with the and so the questionnaire should stick around
        return;
    }

    private isSpecificAnswerByTouch(input: ControlInput): boolean {
        const content = this.getQuestionnaireContent(input);
        try {
            okIf(InputUtil.isAPLUserEventWithMatchingControlId(input, this.id));
            const userEvent = input.request as interfaces.alexa.presentation.apl.UserEvent;
            okIf(userEvent.arguments !== undefined);
            okIf(userEvent.arguments.length === 4);
            const kind = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![1] as string;
            const questionId = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![2] as string;
            const choiceIndex = (input.request as interfaces.alexa.presentation.apl.UserEvent)
                .arguments![3] as number;
            okIf(kind === 'radioClick');
            okIf(content.questions.find((q) => q.id === questionId) !== undefined);
            okIf(choiceIndex >= -1 && choiceIndex < content.choices.length);
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private handleSpecificAnswerByTouch(input: ControlInput, resultBuilder: ControlResultBuilder) {
        // The SendEvent provides arguments: [controlId, questionId, choiceId]
        const content = this.getQuestionnaireContent(input);
        const questionId = (input.request as interfaces.alexa.presentation.apl.UserEvent).arguments![2];
        const choiceIndex = (input.request as interfaces.alexa.presentation.apl.UserEvent).arguments![3];
        assert(choiceIndex !== undefined);
        const questionIndex = this.getQuestionIndexById(content, questionId);
        const choiceId = choiceIndex === -1 ? undefined : content.choices[choiceIndex].id;
        this.updateAnswer(questionId, choiceId, input, resultBuilder);
        //we do _not_ call addCompletionActIfImplicitlyComplete on answer by touch because
        //we require explicit completion on the screen, unlike voice where it is better to
        //move right along.

        this.state.userExplicitlyCompleted = false; // user interacted with the and so the questionnaire should stick around
        this.inputWasAnswerByTouch = true;
        return;
    }

    private isCompletionRequestByVoice(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isIntent(input, GeneralControlIntent.name));
            const { feedback, action, target } = unpackGeneralControlIntent(
                (input.request as IntentRequest).intent,
            );
            okIf(InputUtil.targetIsMatchOrUndefined(target, this.props.interactionModel.targets));
            okIf(InputUtil.feedbackIsMatchOrUndefined(feedback, [$.Feedback.Affirm, $.Feedback.Disaffirm]));
            okIf(InputUtil.actionIsMatch(action, this.props.interactionModel.actions.complete));
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private isCompletionRequestByTouch(input: ControlInput): boolean {
        try {
            okIf(InputUtil.isAPLUserEventWithMatchingControlId(input, this.id));
            const userEvent = input.request as interfaces.alexa.presentation.apl.UserEvent;
            okIf(userEvent.arguments !== undefined);
            okIf(userEvent.arguments.length === 2);
            const kind = (input.request as interfaces.alexa.presentation.apl.UserEvent).arguments![1];
            okIf(kind === 'complete');
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private async handleCompletionRequest(input: ControlInput, resultBuilder: ControlResultBuilder) {
        const content = this.getQuestionnaireContent(input);

        const validationResult = await evaluateValidationProp(this.props.valid, this.state, input);
        if (validationResult === true) {
            this.setCompletionFlag();
            resultBuilder.addAct(new CompletedAct(this));
        } else {
            resultBuilder.addAct(new QuestionnaireCompletionRejectedAct(this, { ...validationResult }));
        }
        return;
    }

    private isBareYesToCompletionQuestion(input: ControlInput): boolean {
        try {
            okIf(this.state.activeInitiative?.actName === AskIfCompleteAct.name);
            okIf(InputUtil.isBareYes(input));
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private isBareNoToCompletionQuestion(input: ControlInput): boolean {
        try {
            okIf(this.state.activeInitiative?.actName === AskIfCompleteAct.name);
            okIf(InputUtil.isBareNo(input));
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private handleBareNoToCompletionQuestion(input: ControlInput, resultBuilder: ControlResultBuilder) {
        resultBuilder.addAct(new AcknowledgeNotCompleteAct(this));

        this.state.userExplicitlyCompleted = false; // user interacted with the and so the questionnaire should stick around
        this.state.userDisconfirmedCompletion = true; // so that we avoid pestering the user.
        return;
    }

    standardInitiativeHandlers: ControlInitiativeHandler[] = [
        {
            name: 'std::askLineItem',
            canTakeInitiative: this.wantsToAskLineItemQuestion,
            takeInitiative: this.askLineItemQuestion,
        },
        {
            name: 'std::askIfComplete',
            canTakeInitiative: this.wantsToAskIfComplete,
            takeInitiative: this.askIfComplete,
        },
        {
            name: 'std::isInitiativeViaApl',
            canTakeInitiative: this.wantsToKeepAplInitiative,
            takeInitiative: this.keepAplInitiative,
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
                `More than one handler matched. Handlers in a single control should be mutually exclusive. ` +
                    `Defaulting to the first. handlers: ${JSON.stringify(matches.map((x) => x.name))}`,
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
                'QuestionnaireControl: takeInitiative called but this.initiativeFunc is not set. canTakeInitiative() should be called first to set this.initiativeFunc.';
            log.error(errorMsg);
            throw new Error(errorMsg);
        }
        await this.initiativeFunc(input, resultBuilder);
        return;
    }

    private wantsToKeepAplInitiative(input: ControlInput): boolean {
        try {
            okIf(this.inputWasAnswerByTouch);
            return true;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private keepAplInitiative(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const initiativeAct = new ActiveAPLInitiativeAct(this);
        resultBuilder.addAct(initiativeAct);
        resultBuilder.enterIdleState();
        this.state.activeInitiative = { actName: initiativeAct.constructor.name };
    }

    private wantsToAskLineItemQuestion(input: ControlInput): boolean {
        const content = this.getQuestionnaireContent(input);
        try {
            okIf(this.isActive(input));
            failIf(this.inputWasAnswerByTouch);

            const firstUnansweredQuestion = content.questions.find(
                (q) => this.state.value[q.id] === undefined,
            );

            if (firstUnansweredQuestion !== undefined) {
                return true;
            }

            return false;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private askLineItemQuestion(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const content = this.getQuestionnaireContent(input);
        // const renderedContent = this.getRenderedQuestionnaireContent(input);

        // if all the questions have been answered, but we reactivated the control, ask
        // the first question.
        const firstUnansweredQuestion =
            content.questions.find((q) => this.state.value[q.id] === undefined) ?? content.questions[0];

        this.state.focusQuestionId = firstUnansweredQuestion!.id;

        // const renderedQuestion = this.props.questionRenderer.call(this, this.state.focusQuestionId, input);

        const initiativeAct = new AskQuestionAct(this, {
            questionnaireContent: content,
            answers: this.state.value,
            questionId: this.state.focusQuestionId,
        });

        resultBuilder.addAct(initiativeAct);
        this.state.activeInitiative = { actName: initiativeAct.constructor.name };
    }

    private wantsToAskIfComplete(input: ControlInput): boolean {
        const content = this.getQuestionnaireContent(input);
        try {
            okIf(this.isActive(input));
            okIf(
                this.state.requiresExplicitCompletion ||
                    this.evaluateBooleanPropNewStyle(this.props.dialog.confirmationRequired, input),
            );
            const firstUnansweredQuestion = this.getFirstUnansweredQuestion(content);
            return firstUnansweredQuestion === undefined;
        } catch (e) {
            verifyErrorIsGuardFailure(e);
            return false;
        }
    }

    private askIfComplete(input: ControlInput, resultBuilder: ControlResultBuilder): void {
        const content = this.getQuestionnaireContent(input);
        let initiativeAct;
        if (this.state.userDisconfirmedCompletion) {
            initiativeAct = new AskIfCompleteTerseAct(this);
        } else {
            initiativeAct = new AskIfCompleteAct(this);
        }
        this.state.activeInitiative = { actName: initiativeAct.constructor.name };
        resultBuilder.addAct(initiativeAct);
    }

    /**
     * Evaluate the questionnaireContent prop
     */
    public getQuestionnaireContent(input: ControlInput): QuestionnaireContent {
        const propValue = this.props.questionnaireData;
        const content = typeof propValue === 'function' ? propValue.call(this, this, input) : propValue;

        if (content.choices.length === 0) {
            throw new Error('props.questionnaireContent has no choices');
        }

        // content.choiceForYesUtterance = content.choiceForYesUtterance ?? 'dummy';
        // content.choiceForNoUtterance = content.choiceForNoUtterance ?? 'dummy';

        const deepRequiredContent: QuestionnaireContent = {
            choices: content.choices,
            questions: content.questions,
            // choiceForYesUtterance: content.choiceForYesUtterance ?? 'dummy',
            // choiceForNoUtterance: content.choiceForNoUtterance ?? 'dummy',
        };

        return deepRequiredContent;
    }

    private evaluateAPLPropNewStyle(prop: AplDocumentPropNewStyle, input: ControlInput): AplContent {
        return typeof prop === 'function' ? (prop as AplContentFunc).call(this, this, input) : prop;
    }

    // tsDoc - see ControlStateDiagramming
    public stringifyStateForDiagram(): string {
        let text = ''; // TODO:Maybe: some representation of the answers?
        if (this.state.activeInitiative !== undefined) {
            text += `[${this.state.activeInitiative.actName}]`;
        }
        return text;
    }

    // tsDoc - see Control
    public renderAct(act: SystemAct, input: ControlInput, builder: ControlResponseBuilder): void {
        // initiative acts (which include APL generation)
        if (act instanceof AskQuestionAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.askQuestionAct, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.askQuestionAct, input),
            );
            this.addStandardAPL(input, builder);
        } else if (act instanceof AskIfCompleteAct) {
            builder.addPromptFragment(this.evaluatePromptProp(act, this.props.prompts.askIfComplete, input));
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.askIfComplete, input),
            );
            this.addStandardAPL(input, builder);
        } else if (act instanceof AskIfCompleteTerseAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.askIfCompleteTerse, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.askIfCompleteTerse, input),
            );
            this.addStandardAPL(input, builder);
        }

        // content acts.
        else if (act instanceof QuestionAnsweredAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.questionAnsweredAct, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.questionAnsweredAct, input),
            );
        } else if (act instanceof CompletedAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.questionnaireCompleted, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.questionnaireCompleted, input),
            );
        } else if (act instanceof QuestionnaireCompletionRejectedAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.questionnaireCompletionRejected, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.questionnaireCompletionRejected, input),
            );
        } else if (act instanceof AcknowledgeNotCompleteAct) {
            builder.addPromptFragment(
                this.evaluatePromptProp(act, this.props.prompts.acknowledgeNotCompleteAct, input),
            );
            builder.addRepromptFragment(
                this.evaluatePromptProp(act, this.props.reprompts.acknowledgeNotCompleteAct, input),
            );
        } else if (act instanceof ActiveAPLInitiativeAct) {
            builder.setDisplayUsed();
        } else {
            this.throwUnhandledActError(act);
        }
    }

    private addStandardAPL(input: ControlInput, builder: ControlResponseBuilder) {
        if (
            this.evaluateBooleanProp(this.props.apl.enabled, input) === true &&
            getSupportedInterfaces(input.handlerInput.requestEnvelope)['Alexa.Presentation.APL']
        ) {
            const renderedAPL = this.evaluateAPLPropNewStyle(this.props.apl.askQuestion, input);
            builder.addAPLRenderDocumentDirective(this.id, renderedAPL.document, renderedAPL.dataSource);
        }
    }

    // tsDoc - see Control
    public updateInteractionModel(generator: ControlInteractionModelGenerator, imData: ModelData) {
        generator.addControlIntent(new GeneralControlIntent(), imData);

        if (this.props.interactionModel.slotType !== 'dummy') {
            generator.addControlIntent(
                new SingleValueControlIntent(
                    this.props.interactionModel.slotType,
                    this.props.interactionModel.filteredSlotType,
                ),
                imData,
            );
        }
        generator.addYesAndNoIntents();

        generator.ensureSlotIsDefined(this.id, this.props.interactionModel.slotType);
        generator.ensureSlotIsNoneOrDefined(this.id, this.props.interactionModel.filteredSlotType);

        for (const [capability, actionSlotIds] of Object.entries(this.props.interactionModel.actions)) {
            generator.ensureSlotValueIDsAreDefined(this.id, 'action', actionSlotIds);
        }

        generator.ensureSlotValueIDsAreDefined(this.id, 'target', this.props.interactionModel.targets);

        generator.ensureSlotValueIDsAreDefined(
            this.id,
            'target',
            this.props.interactionModel.allQuestionTargets,
        );
    }

    /**
     * Clear the state of this control.
     */
    public clear() {
        this.state = new QuestionnaireControlState();
        this.state.value = {};
    }

    public updateAnswer(
        questionId: string,
        choiceId: string | undefined,
        input: ControlInput,
        resultBuilder: ControlResultBuilder,
    ): void {
        if (choiceId !== undefined) {
            this.state.value[questionId] = { choiceId };
        } else {
            delete this.state.value[questionId];
        }
    }

    public getQuestionContentById(questionId: string, input: ControlInput): DeepRequired<Question> {
        const questionnaireContent = this.getQuestionnaireContent(input);
        const questions = questionnaireContent.questions;
        const question = questions.find((x) => x.id === questionId);

        assert(question !== undefined, `Question not found. id=${questionId}`);
        return question;
    }

    public getChoiceIndexById(content: QuestionnaireContent, answerId: string): number | undefined {
        const idx = content.choices.findIndex((choice) => choice.id === answerId);
        return idx >= 0 ? idx : undefined;
    }

    public getQuestionIndexById(content: QuestionnaireContent, questionId: string): number {
        const idx = content.questions.findIndex((question) => question.id === questionId);
        assert(idx >= 0, `Not found. questionId=${questionId}`);
        return idx;
    }

    /**
     * Determine if the control is idle and should not take initiative.
     * @param input - Input.
     */
    private isActive(input: ControlInput) {
        // if we haven't started and required=false, then don't start.
        if (
            _.isEmpty(this.state.value) &&
            this.evaluateBooleanPropNewStyle(this.props.required, input) === false
        ) {
            return false;
        }
        if (this.state.userExplicitlyCompleted) {
            return false;
        }
        return true;
    }

    private getFirstUnansweredQuestion(content: QuestionnaireContent) {
        return content.questions.find((q) => this.state.value[q.id] === undefined);
    }

    // TODO: can probably refactor these back to inline.
    // as it is better to make higher-level 'capability functions' the public ones.

    private setCompletionFlag() {
        this.state.userExplicitlyCompleted = true;
    }

    private getSlotTypes(): string[] {
        return [this.props.interactionModel.slotType, this.props.interactionModel.filteredSlotType];
    }

    addCompletionActIfImplicitlyComplete(input: ControlInput, resultBuilder: ControlResultBuilder) {
        assert(this.inputWasAnswerByTouch === false, 'Implicit completion should not happen after touch.');

        const content = this.getQuestionnaireContent(input);
        const allAnswersProvided = this.getFirstUnansweredQuestion(content) === undefined;
        const confirmationRequired = this.evaluateBooleanPropNewStyle(
            this.props.dialog.confirmationRequired,
            input,
        );
        const requiresExplicitCompletion = this.state.requiresExplicitCompletion;
        if (allAnswersProvided && !confirmationRequired && !requiresExplicitCompletion) {
            resultBuilder.addAct(new CompletedAct(this));
        }
    }

    /**
     * Evaluate a boolean prop.
     *
     * @param propValue - Constant or function producing boolean
     * @param input - The input object
     */
    evaluateBooleanPropNewStyle(
        propValue: boolean | ((control: QuestionnaireControl, input: ControlInput) => boolean),
        input: ControlInput,
    ): boolean {
        return typeof propValue === 'function' ? propValue.call(this, this, input) : propValue;
    }

    evaluatePromptShortForm(
        propValue: string | ((control: QuestionnaireControl, input: ControlInput) => string),
        input: ControlInput,
    ): string {
        const val = typeof propValue === 'function' ? propValue.call(this, this, input) : propValue;
        return val;
    }
}
