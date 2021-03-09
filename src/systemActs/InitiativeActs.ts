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
import { ListFormatting } from '../intl/ListFormat';
import { ControlResponseBuilder } from '../responseGeneration/ControlResponseBuilder';
import {
    LiteralContentPayload,
    RequestChangedValueByListPayload,
    RequestChangedValuePayload,
    RequestRemovedValueByListActPayload,
    RequestValueByListPayload,
    RequestValuePayload,
    SuggestActionPayload,
    TargetDisambiguationPayload as DisambiguateTargetPayload,
    ValueSetPayload
} from './PayloadTypes';
import { SystemAct } from './SystemAct';

/**
 * Base type for System Acts that 'take the initiative'.
 *
 * An act is 'taking the initiative' if it represents a direct question or otherwise encourages the user to continue the conversation.
 *
 * Examples:
 *   * RequestValueAct  is-a  InitiativeAct.  Sample prompt: "How many ducks?"       (an explicit question requesting a response)
 *   * NextTaskAct      is-a  InitiativeAct.  Sample prompt: "Next task please."     (this is explicit encouragement to continue)
 *
 * Usage:
 *  * Introduce a new InitiativeAct for any behavior that is not precisely captured by existing acts.
 *    The is no restriction on creating as many act types as necessary for a new control or skill
 *
 *  * An InitiativeAct is not restricted to only represent initiative.  It is valid
 *    to represent both initiative and some content if they are fundamentally connected.
 *    However, it is usual to define separate acts if they can reasonably be used in isolation.
 *
 * Framework behavior:
 *  * The framework requires that every turn includes exactly one InitiativeAct except for
 *    terminal turns that stop the user's session. (by setting ControlResult.sessionBehavior)
 *
 * Remarks:
 *  * Alexa certification policy requires that each turn that leaves the microphone open clearly prompts
 *    the user to reply or continue. Hence an initiative act must always be present and rendered clearly.
 *  * If Alexa's reply doesn't not explicitly encourage the user to continue the conversation, the session must be closed.
 */
export abstract class InitiativeAct extends SystemAct {
    constructor(control: Control) {
        super(control, { takesInitiative: true });
    }
}

/**
 * The APL document is providing the initiative by offering input widgets.
 *
 * Use this act if, and only if,
 * 1. a control received touch input
 * 2. the APL document has input widgets and the user clearly knows they should press something
 * 3. it is desirable to avoid disrupting the user with voice while they interact with the
 *    screen.
 */
export class ActiveAPLInitiativeAct extends InitiativeAct {
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {}
}

/**
 * Asks the user to provide a value.
 *
 * Default rendering (en-US): "What value for (renderedTarget)?" for both prompt & reprompt
 *
 * Usage:
 *  * If the system already has a value from the user it may be preferable to issue a `RequestChangedValueAct`
 *    which is more specific to that case.
 *  * Typically issued when a Control gains the initiative for the first time and requests a value for the first time.
 */
//TODO: remove default render function.  The framework acts are not really
//expected to be used this way.  Rather, we expect the Control.render() methods to do the
//rendering.  Offering default rendering for the act on its own seems like over-engineering.
export class RequestValueAct extends InitiativeAct {
    payload: RequestValuePayload;

    constructor(control: Control, payload?: RequestValuePayload) {
        super(control);
        this.payload = payload ?? {};
    }
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        if (this.payload.renderedTarget !== undefined) {
            controlResponseBuilder.addPromptFragment(
                i18next.t('REQUEST_VALUE_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedTarget,
                }),
            );
            controlResponseBuilder.addRepromptFragment(
                i18next.t('REQUEST_VALUE_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedTarget,
                }),
            );
        } else {
            throw new Error(
                `Cannot directly render RequestValueAct as payload.renderedTarget is undefined. ${this.toString()}. ` +
                    `Either provide a renderedTarget when creating the act, or render the act in control.render() or controlManager.render().`,
            );
        }
    }
}

/**
 * Asks the user to provide a new/updated value.
 *
 * Default rendering (en-US): "What is the new value for (renderedTarget)?" for both
 * prompt & reprompt
 *
 * Usage:
 *  * Typically issued in response to the user saying they want to change a value, e.g. "U: Please change the event date."
 *
 */
export class RequestChangedValueAct extends InitiativeAct {
    payload: RequestChangedValuePayload;

    constructor(control: Control, payload: RequestChangedValuePayload) {
        super(control);
        this.payload = payload;
    }
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        if (this.payload.renderedTarget !== undefined) {
            controlResponseBuilder.addPromptFragment(
                i18next.t('REQUEST_CHANGED_VALUE_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedTarget,
                }),
            );
            controlResponseBuilder.addRepromptFragment(
                i18next.t('REQUEST_CHANGED_VALUE_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedTarget,
                }),
            );
        } else {
            throw new Error(
                `Cannot directly render RequestChangedValueAct as payload.renderedTarget is undefined. ${this.toString()}. ` +
                    `Either provide a renderedTarget when creating the act, or render the act in control.render() or controlManager.render().`,
            );
        }
    }
}

/**
 * Asks the user to provide a value by speaking and showing items in the form of a list.
 *
 * Default rendering (en-US): "What value for (renderedTarget)? Choices include
 * (renderedChoices)." for both prompt & reprompt
 *
 * Usage:
 *  * Typically issued when a Control gains the initiative for the first time and requests a value for the first time.
 *  * If the system already has a value from the user it may be preferable to issue a `RequestChangedValueAct`
 *    which is more specific to that case.
 */
export class RequestValueByListAct extends InitiativeAct {
    payload: RequestValueByListPayload;

    constructor(control: Control, payload: RequestValueByListPayload) {
        super(control);
        this.payload = payload;
    }
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        if (this.payload.renderedTarget !== undefined && this.payload.renderedChoices !== undefined) {
            controlResponseBuilder.addPromptFragment(
                i18next.t('REQUEST_VALUE_BY_LIST_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedTarget,
                    choices: this.payload.renderedChoices,
                }),
            );
            controlResponseBuilder.addRepromptFragment(
                i18next.t('REQUEST_VALUE_BY_LIST_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedTarget,
                    choices: this.payload.renderedChoices,
                }),
            );
        } else {
            throw new Error(
                `Cannot directly render RequestValueByListAct as payload.renderedTarget is undefined. ${this.toString()}. ` +
                    `Either provide a renderedTarget when creating the act, or render the act in control.render() or controlManager.render().`,
            );
        }
    }
}

/**
 * Asks the user to provide a new/updated value by speaking and showing items in the form of a list.
 *
 * Default rendering (en-US): "What is the new value for (renderedTarget)? Choices include
 * (renderedChoices)." for both prompt & reprompt
 *
 * Usage:
 *  * Typically issued when a Control gains the initiative for the first time and requests a value for the first time.
 *  * If the system already has a value from the user it may be preferable to issue a `RequestChangedValueAct`
 *    which is more specific to that case.
 */
export class RequestChangedValueByListAct extends InitiativeAct {
    payload: RequestChangedValueByListPayload;

    constructor(control: Control, payload: RequestChangedValueByListPayload) {
        super(control);
        this.payload = payload;
    }
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        if (this.payload.renderedTarget !== undefined) {
            controlResponseBuilder.addPromptFragment(
                i18next.t('REQUEST_CHANGED_VALUE_BY_LIST_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedTarget,
                    choices: ListFormatting.format(this.payload.choicesFromActivePage),
                }),
            );
            controlResponseBuilder.addRepromptFragment(
                i18next.t('REQUEST_CHANGED_VALUE_BY_LIST_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedTarget,
                    choices: ListFormatting.format(this.payload.choicesFromActivePage),
                }),
            );
        } else {
            throw new Error(
                `Cannot directly render RequestChangedValueByListAct as payload.renderedTarget is undefined. ${this.toString()}. ` +
                    `Either provide a renderedTarget when creating the act, or render the act in control.render() or controlManager.render().`,
            );
        }
    }
}

export class RequestRemovedValueByListAct extends InitiativeAct {
    payload: RequestRemovedValueByListActPayload;

    constructor(control: Control, payload: RequestRemovedValueByListActPayload) {
        super(control);
        this.payload = payload;
    }
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        if (this.payload.renderedTarget !== undefined && this.payload.renderedChoices !== undefined) {
            controlResponseBuilder.addPromptFragment(
                i18next.t('REQUEST_CHANGED_VALUE_BY_LIST_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedTarget,
                    choices: this.payload.renderedChoices,
                }),
            );
            controlResponseBuilder.addRepromptFragment(
                i18next.t('REQUEST_CHANGED_VALUE_BY_LIST_ACT_DEFAULT_PROMPT', {
                    value: this.payload.renderedTarget,
                    choices: this.payload.renderedChoices,
                }),
            );
        } else {
            throw new Error(
                `Cannot directly render RequestRemovedValueByListAct as payload.renderedTarget is undefined. ${this.toString()}. ` +
                    `Either provide a renderedTarget when creating the act, or render the act in control.render() or controlManager.render().`,
            );
        }
    }
}

/**
 * An initiative act that asks the user if a value is correct.
 *
 * Default rendering (en-US): "Was that [value]?" for both prompt & reprompt
 */
export class ConfirmValueAct<T> extends InitiativeAct {
    payload: ValueSetPayload<T>;

    constructor(control: Control, payload: ValueSetPayload<T>) {
        super(control);
        this.payload = payload;
    }
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        controlResponseBuilder.addPromptFragment(
            i18next.t('CONFIRM_VALUE_ACT_DEFAULT_PROMPT', {
                value: this.payload.value,
            }),
        );
        controlResponseBuilder.addRepromptFragment(
            i18next.t('CONFIRM_VALUE_ACT_DEFAULT_PROMPT', {
                value: this.payload.value,
            }),
        );
    }
}

/**
 * An initiative act that defines literal prompt and reprompt fragments.
 *
 * Default rendering: "[this.payload.promptFragment]?" for both prompt & reprompt
 *
 * Usage:
 *  * Use LiteralInitiativeAct only in simple situations where it would be annoying
 *    to create a new custom act only to have a single way to render it.
 *  * In contrast, specific initiative acts convey information more clearly,
 *    maintain controller/view separation and can often be reused in additional scenarios.
 */
export class LiteralInitiativeAct extends InitiativeAct {
    payload: LiteralContentPayload;

    constructor(control: Control, payload: LiteralContentPayload) {
        super(control);
        this.payload = {
            promptFragment: payload.promptFragment,
            repromptFragment: payload.repromptFragment ?? payload.promptFragment,
        };
    }
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        controlResponseBuilder.addPromptFragment(this.payload.promptFragment);
        controlResponseBuilder.addRepromptFragment(this.payload.repromptFragment!);
    }
}

/**
 * An initiative act that suggests a specific value with a asks yes/no question.
 *
 * Default (en-US): "Did you perhaps mean [this.payload.value]?" for both prompt and reprompt
 */
export class SuggestValueAct<T> extends InitiativeAct {
    payload: ValueSetPayload<T>;

    constructor(control: Control, payload: ValueSetPayload<T>) {
        super(control);
        this.payload = payload;
    }
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        controlResponseBuilder.addPromptFragment(
            i18next.t('SUGGEST_VALUE_ACT_DEFAULT_PROMPT', {
                value: this.payload.value,
            }),
        );
        controlResponseBuilder.addRepromptFragment(
            i18next.t('SUGGEST_VALUE_ACT_DEFAULT_PROMPT', {
                value: this.payload.value,
            }),
        );
    }
}

export class SuggestActionAct<T> extends InitiativeAct {
    payload: SuggestActionPayload<T>;

    constructor(control: Control, payload?: SuggestActionPayload<T>) {  //TODO: why does this have an optional payload?
        super(control);
        this.payload = payload ?? {};
    }
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        if (this.payload.renderedTarget !== undefined) {
            controlResponseBuilder.addPromptFragment(i18next.t('SUGGEST_ACTION_ACT_DEFAULT_PROMPT'));
            controlResponseBuilder.addRepromptFragment(i18next.t('SUGGEST_ACTION_ACT_DEFAULT_PROMPT'));
        } else {
            throw new Error(
                `Cannot directly render SuggestActionAct as payload.renderedTarget is undefined. ${this.toString()}. ` +
                    `Either provide a renderedTarget when creating the act, or render the act in control.render() or controlManager.render().`,
            );
        }
    }
}


export class DisambiguateTargetAct extends InitiativeAct {
    payload: DisambiguateTargetPayload;

    constructor(control: Control, payload: DisambiguateTargetPayload) {
        super(control);
        this.payload = payload ?? {};
    }
    render(input: ControlInput, controlResponseBuilder: ControlResponseBuilder): void {
        if (this.payload.renderedSpecificTargets !== undefined) {
            controlResponseBuilder.addPromptFragment(i18next.t('DISAMBIGUATE_TARGET_ACT_DEFAULT_PROMPT', {renderedTargets: this.payload.renderedSpecificTargets}));
            controlResponseBuilder.addRepromptFragment(i18next.t('DISAMBIGUATE_TARGET_ACT_DEFAULT_PROMPT', {renderedTargets: this.payload.renderedSpecificTargets}));
        } else {
            throw new Error(
                `Cannot directly render DisambiguateTargetAct as payload.renderedSpecificTargets is undefined. ${this.toString()}. ` +
                    `Either provide renderedSpecificTargets when creating the act, or render the act in control.render() or controlManager.render().`,
            );
        }
    }
}
