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
import { IntentRequest, interfaces } from 'ask-sdk-model';
import {
    AmazonIntent,
    ContainerControl,
    ContainerControlProps,
    ContentAct,
    ControlInput,
    ControlResponseBuilder,
    ControlResultBuilder,
    InputUtil,
    LiteralContentAct,
} from '../../../src';

/**
 * Communicates a simple "welcome" message.
 */
export class WelcomeAct extends ContentAct {
    render(input: ControlInput, responseBuilder: ControlResponseBuilder) {
        responseBuilder.addPromptFragment('Welcome.');
    }
}

/**
 * A container control that handles LaunchRequest and is thus suitable for use
 * as a basic root control.
 *
 * On launch, a welcome message is issued
 */
export class DemoRootControl extends ContainerControl {
    handleFunc: (input: ControlInput, resultBuilder: ControlResultBuilder) => Promise<void>;
    takeInitiativeFunc: (input: ControlInput, resultBuilder: ControlResultBuilder) => Promise<void>;

    constructor(props: ContainerControlProps) {
        super({ id: props.id });
    }

    async canHandle(input: ControlInput) {
        // directly handle launch request
        if (InputUtil.isLaunchRequest(input)) {
            this.handleFunc = this.handleLaunch;
            return true;
        }

        if (InputUtil.isSessionEndedRequest(input)) {
            this.handleFunc = this.handleSessionEnded;
            return true;
        }

        // otherwise delegate to children
        if (await this.canHandleByChild(input)) {
            return true;
        }

        this.handleFunc = this.handleFallbackEtc;
        return true;
    }

    async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        if (this.handleFunc !== undefined) {
            await this.handleFunc(input, resultBuilder);
            return;
        }
        return this.handleByChild(input, resultBuilder);
    }

    async handleLaunch(input: ControlInput, resultBuilder: ControlResultBuilder) {
        resultBuilder.addAct(new WelcomeAct(this));
    }

    async handleSessionEnded(input: ControlInput, resultBuilder: ControlResultBuilder) {
        //nothing.
    }

    async handleFallbackEtc(input: ControlInput, resultBuilder: ControlResultBuilder) {
        let requestDescription;
        if (InputUtil.isIntent(input)) {
            requestDescription = (input.request as IntentRequest).intent.name;
        } else if (input.request.type === 'Alexa.Presentation.APL.UserEvent') {
            requestDescription = '';
            const event = input.request as interfaces.alexa.presentation.apl.UserEvent;
            const args = (event.arguments ?? []).join(', ');
            requestDescription = `APL UserEvent with params ${args}`;
        } else {
            requestDescription = 'Input of unknown type';
        }

        resultBuilder.addAct(
            new LiteralContentAct(this, {
                promptFragment: `${requestDescription} was not handled by any control.`,
            }),
        );
    }
}
