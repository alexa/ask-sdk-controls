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

import i18next from 'i18next';
import { Control } from '../controls/Control';
import { ControlInput } from '../controls/ControlInput';
import { ControlResponseBuilder } from '../responseGeneration/ControlResponseBuilder';
import { addFragmentsForResponseStyle } from '../utils/ResponseUtils';
import {
    InvalidValuePayload,
    LiteralContentPayload,
    ProblematicInputValuePayload,
    ValueAddedPayload,
    ValueChangedPayload,
    ValueClearedPayload,
    ValueRemovedPayload,
    ValueSetPayload,
} from './PayloadTypes';
import { SystemAct } from './SystemAct';

/**
 * Base type for System Acts that provides 'content' or 'simple information'.
 *
 * An act is 'content' if it does not directly encourage the user to reply.
 *
 * Examples:
 *   * ApologyAct  is-a  ContentAct.  Sample prompt: "A: Sorry, my mistake."         (simple information, no encouragement to continue)
 *   * WeatherAct  is-a  ContentAct.  Sample prompt: "A: The weather will be warm."  (business content, no encouragement to continue)
 *
 * Framework behavior:
 *  * The framework requires that every turn includes exactly one InitiativeAct except for
 *    terminal turns that stop the user's session by setting `ControlResult.sessionBehavior`.
 */
export abstract class ContentAct extends SystemAct {
    constructor(control: Control) {
        super(control, { takesInitiative: false });
    }
}

/**
 * Communicates that an input cannot be consumed.
 *
 * Typically, 'invalid input' means that the input cannot be consumed given the current state of the skill and the input will be ignored.
 *
 * Default rendering (en-US): "Sorry, (renderedReason)."
 *
 * Usage:
 *  * Controls should override the render and provide more detail about the specific problem by rendering
 *    the reasonCode.
 *
 * Example:
 *   * A list control offers three options but the user says "The fourth one".
 */
export class UnusableInputValueAct<T> extends ContentAct {
    public readonly payload: ProblematicInputValuePayload<T>;

    constructor(control: Control, payload: ProblematicInputValuePayload<T>) {
        super(control);
        this.payload = payload;
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        if (this.payload.renderedReason !== undefined) {
            addFragmentsForResponseStyle({
                responseStyle: input.suggestedResponseStyle,
                voicePrompt: i18next.t('UNUSABLE_INPUT_VALUE_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedReason,
                }),
                builder: controlResponseBuilder,
            });
        } else {
            throw new Error(
                `Cannot directly render UnusableInputValueAct as payload.renderedReason is undefined. ${this.toString()}. ` +
                    `Either provide a renderedReason when creating the act, or render the act in control.render() or controlManager.render().`,
            );
        }
    }
}

/**
 * Communicates that input was received an interpreted successfully.
 *
 * Default rendering (en-US): "OK."
 *
 * Usage:
 *  * Often a more specific act (e.g. ValueSetAct) will be used to describe more
 *    precisely what was understood and acted upon.
 *  * Do not issue `AcknowledgeInputAct` if another act has been issued that
 *    also conveys that the user's input was received and interpreted successfully.
 */
export class AcknowledgeInputAct extends ContentAct {
    constructor(control: Control) {
        super(control);
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('ACKNOWLEDGE_INPUT_ACT_DEFAULT_PROMPT'),
            builder: controlResponseBuilder,
        });
    }
}

/**
 * Communicates that a value was received and recorded.
 *
 * This act does not imply that the value is valid or otherwise meets
 * any requirements.  It merely communicates successful reception.
 *
 * This act implies that there was no significant ambiguity.  In situations were
 * ambiguity is present a more specific act should be created and issued to communicate
 * that clearly to the user.
 *
 * Default rendering (en-US): "OK, (value)".
 *
 * Usage:
 *  * If received value overrides a value previously obtained from the user
 *    it is preferable to issue a `ValueChangedAct` which is more specific to that case.
 *  * Typically issued when a Control elicits a value from the user and the
 *    user replies directly.
 *  * Also issued when the user provides data on their own initiative which
 *    can be interpreted unambiguously, e.g. "U: Send it on Thursday".
 */
export class ValueSetAct<T> extends ContentAct {
    public readonly payload: ValueSetPayload<T>;

    constructor(control: Control, payload: ValueSetPayload<T>) {
        super(control);
        this.payload = payload;
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('VALUE_SET_ACT_DEFAULT_PROMPT', {
                value: this.payload.value,
            }),
            builder: controlResponseBuilder,
        });
    }
}

/**
 * Communicates that a value was received and recorded as a change to previously obtained information.
 *
 * This act does not imply that the value is valid or otherwise meets
 * any requirements.  It merely communicates successful reception.
 *
 * This act implies that there was no significant ambiguity.  In situations were
 * ambiguity is present a more specific act should be created and issued to communicate
 * that clearly to the user.
 *
 * Default rendering (en-US): "OK, updated to (value)."
 *
 * Usage:
 *  * Typically issued when a user explicitly changes a value, e.g. 'actually change it to tomorrow'.
 *  * Also issued when the user provides data on their own initiative which override previous data
 *    e.g. "U: Send it Monday" ... then later ...  "U: Send it on Thursday".
 */
export class ValueChangedAct<T> extends ContentAct {
    payload: ValueChangedPayload<T>;

    constructor(control: Control, payload: ValueChangedPayload<T>) {
        super(control);
        this.payload = payload;
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('VALUE_CHANGED_ACT_DEFAULT_PROMPT', {
                value: this.payload.value,
            }),
            builder: controlResponseBuilder,
        });
    }
}

/**
 * Communicates that a value is invalid.
 *
 * Typically, 'invalid' means that a value cannot be used in business functions with the implication that it
 * must be corrected or retracted before the user can complete their task.
 *
 * Note that a value can become invalid due to external causes as the validation rules can access other controls and context.
 *
 * Default rendering (en-US): "Sorry, (renderedReason)."
 *
 * Usage:
 *  * Controls should override the render and provide more detail about the specific problem by rendering
 *    the reasonCode.
 */
export class InvalidValueAct<T> extends ContentAct {
    public readonly payload: InvalidValuePayload<T>;

    constructor(control: Control, payload: InvalidValuePayload<T>) {
        super(control);
        this.payload = payload;
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        if (this.payload.renderedReason !== undefined) {
            addFragmentsForResponseStyle({
                responseStyle: input.suggestedResponseStyle,
                voicePrompt: i18next.t('INVALID_VALUE_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedReason,
                }),
                builder: controlResponseBuilder,
            });
        } else {
            throw new Error(
                `Cannot directly render InvalidValueAct as payload.renderedReason is undefined. ${this.toString()}. ` +
                    `Either provide a renderedReason when creating the act, or render the act in control.render() or controlManager.render().`,
            );
        }
    }
}

/**
 * Communicates that a value has been positively confirmed.
 *
 * Default rendering (en-US): "Great."
 *
 * Usage:
 *  * Typically issued when the system issued a ConfirmValueAct and received an `affirm` in reply.
 *  * May also be issued in cases where the user repeats a value which is interpreted as confirmation.
 *
 * Example:
 * ```
 * "A: Did you say three?"    ConfirmValueAct
 * "U: Yes"                   GeneralControlIntent( feedback = affirm )
 * "A: Great. <initiative>."  ValueConfirmedAct, <InitiativeAct>
 * ```
 */
export class ValueConfirmedAct<T> extends ContentAct {
    payload: ValueSetPayload<T>;
    constructor(control: Control, payload: ValueSetPayload<T>) {
        super(control);
        this.payload = payload;
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('VALUE_CONFIRMED_ACT_DEFAULT_PROMPT'),
            builder: controlResponseBuilder,
        });
    }
}

/**
 * Communicates that a value has been disconfirmed.
 *
 * Default rendering (en-US): "My mistake."
 *
 * Usage:
 *  * Typically issued when the system issued a ConfirmValueAct and received a `disaffirm` in reply.
 *  * Also issued when the users realizes that a value is incorrect and corrects it directly "No, that should be three"
 *
 * Example:
 * ```
 * "A: Did you say three?"         ConfirmValueAct
 * "U: No."                        GeneralControlIntent( feedback = disaffirm )
 * "A: My mistake. <initiative>."  ValueDisconfirmedAct, <InitiativeAct>
 * ```
 */
export class ValueDisconfirmedAct<T> extends ContentAct {
    payload: ValueSetPayload<T>;
    constructor(control: Control, payload: ValueSetPayload<T>) {
        super(control);
        this.payload = payload;
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('VALUE_DISCONFIRMED_ACT_DEFAULT_PROMPT'),
            builder: controlResponseBuilder,
        });
    }
}

/**
 * Communicates that the user's input could not be understood.
 *
 * Default rendering (en-US): "Sorry I didn't understand that."
 *
 * Usage:
 * * Typically issued in response to AMAZON.FallbackIntent.
 * * May also be issued as a generic response when an input doesn't make any
 *   sense given the state of the skill.
 *
 * Example 1:
 * "U: <gibberish>"  AMAZON.FallbackIntent
 * "A: Sorry I didn't understand that."
 *
 * Example 2:
 * "U: change Bob to Frank" ... but no Control is tracking a value of "Bob"
 * "A: Sorry I didn't understand that."
 */
export class NonUnderstandingAct extends ContentAct {
    constructor(control: Control) {
        super(control);
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('NON_UNDERSTANDING_ACT_DEFAULT_PROMPT'),
            builder: controlResponseBuilder,
        });
    }
}

/**
 * Communicates that the skill was launched.
 *
 * Default rendering (en-US): "Welcome."
 */
export class LaunchAct extends ContentAct {
    constructor(control: Control) {
        super(control);
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('LAUNCH_ACT_DEFAULT_PROMPT'),
            builder: controlResponseBuilder,
        });
    }
}

/**
 * Communicates an arbitrary message to the user.
 *
 * Default:
 *  * The repromptFragment defaults to be identical to promptFragment.
 *
 * Usage:
 *  * Use LiteralContentAct only in simple situations where it would be annoying
 *    to create a new custom act only to have a single way to render it.
 *  * In contrast, specific content acts convey information more clearly,
 *    maintain controller/view separation and can often be reused in additional scenarios.
 *
 */
export class LiteralContentAct extends ContentAct {
    payload: LiteralContentPayload;

    constructor(control: Control, payload: LiteralContentPayload) {
        super(control);
        this.payload = {
            promptFragment: payload.promptFragment,
            repromptFragment: payload.repromptFragment ?? payload.promptFragment,
        };
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: this.payload.promptFragment,
            voiceReprompt: this.payload.repromptFragment!,
            builder: controlResponseBuilder,
        });
    }
}

export class ValueAddedAct<T> extends ContentAct {
    public readonly payload: ValueAddedPayload<T>;

    constructor(control: Control, payload: ValueAddedPayload<T>) {
        super(control);
        this.payload = payload;
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('VALUE_ADDED_ACT_DEFAULT_PROMPT', {
                value: this.payload.value,
            }),
            builder: controlResponseBuilder,
        });
    }
}

export class ValueRemovedAct<T> extends ContentAct {
    public readonly payload: ValueRemovedPayload<T>;

    constructor(control: Control, payload: ValueRemovedPayload<T>) {
        super(control);
        this.payload = payload;
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('VALUE_REMOVED_ACT_DEFAULT_PROMPT', {
                value: this.payload.value,
            }),
            builder: controlResponseBuilder,
        });
    }
}

export class ValueClearedAct<T> extends ContentAct {
    public readonly payload: ValueClearedPayload<T>;

    constructor(control: Control, payload: ValueClearedPayload<T>) {
        super(control);
        this.payload = payload;
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('VALUE_CLEARED_ACT_DEFAULT_PROMPT', {
                value: this.payload.value,
            }),
            builder: controlResponseBuilder,
        });
    }
}

export class InvalidRemoveValueAct<T> extends ContentAct {
    public readonly payload: InvalidValuePayload<T>;

    constructor(control: Control, payload: InvalidValuePayload<T>) {
        super(control);
        this.payload = payload;
    }

    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        addFragmentsForResponseStyle({
            responseStyle: input.suggestedResponseStyle,
            voicePrompt: i18next.t('INVALID_REMOVE_VALUE_ACT_DEFAULT_PROMPT', {
                value: this.payload.value,
            }),
            builder: controlResponseBuilder,
        });
    }
}
