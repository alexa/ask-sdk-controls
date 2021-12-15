/*
 * Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

import { suite, test } from 'mocha';
import { expect } from 'chai';
import {
    InputModality,
    ModalityEvaluationDefaults,
    OutputModality,
    ResponseStyle,
} from '../src/modality/ModalityEvaluation';
import { HandlerInput } from 'ask-sdk-core';
import { TestInput } from '../src/utils/testSupport/TestingUtils';
import { ControlHandler } from '../src/runtime/ControlHandler';
import { SkillInvoker } from '../src/utils/testSupport/SkillInvoker';
import { ControlManager, ControlManagerProps } from '../src/controls/ControlManager';
import { ControlInput } from '../src/controls/ControlInput';
import { ContainerControl } from '../src/controls/ContainerControl';
import { ControlResultBuilder } from '../src/controls/ControlResult';
import UserEvent = interfaces.alexa.presentation.apl.UserEvent;
import { interfaces } from 'ask-sdk-model';

suite('== Modality evaluation and tracking scenarios ==', () => {
    const touchInput = TestInput.simpleUserEvent([]);
    const voiceInput = TestInput.of('VoiceIntent');
    const editTextInput = TestInput.userEvent(userEventWithSource('EditText'));
    const vectorGraphicInput = TestInput.userEvent(userEventWithSource('EditText'));
    let manager: TestControlManager;
    let handler: ControlHandler;
    let rootControl: TestControl;
    let lastHistory: InputModality[] | undefined;
    let invoker: SkillInvoker;

    beforeEach(() => {
        manager = new TestControlManager({
            responseStyleEvaluator,
        });
        handler = new ControlHandler(manager);
        rootControl = manager.createControlTree();
        rootControl.lastKnownModality = undefined;
        lastHistory = undefined;
        invoker = new SkillInvoker(handler);
    });

    test('Input and output modality are properly evaluated', async () => {
        await invoker.invoke(touchInput);
        expect(await rootControl.lastKnownModality).to.equal(OutputModality.SCREEN);

        await invoker.invoke(editTextInput);
        expect(await rootControl.lastKnownModality).to.equal(OutputModality.SCREEN);

        await invoker.invoke(vectorGraphicInput);
        expect(await rootControl.lastKnownModality).to.equal(OutputModality.SCREEN);

        await invoker.invoke(voiceInput);
        expect(await rootControl.lastKnownModality).to.equal(OutputModality.VOICE);
    });

    test('Input modality history is properly tracked', async () => {
        await invoker.invoke(touchInput);
        await invoker.invoke(voiceInput);
        expect(lastHistory).to.deep.equal(['touch', 'voice']);
    });

    function responseStyleEvaluator(input: HandlerInput, history: InputModality[]): ResponseStyle {
        lastHistory = JSON.parse(JSON.stringify(history));
        return ModalityEvaluationDefaults.defaultResponseStyleEvaluator(input, history);
    }

    function userEventWithSource(source: string): UserEvent {
        return {
            type: 'Alexa.Presentation.APL.UserEvent',
            requestId: 'amzn1.echo-api.request.1234567890',
            timestamp: '2019-10-04T18:48:22Z',
            locale: 'en-US',
            components: {},
            source: {
                type: source,
                handler: 'Press',
                id: 'TestComponent',
            },
            token: 'testToken',
        };
    }
});

class TestControlManager extends ControlManager {
    constructor(props?: ControlManagerProps) {
        super(props);
    }

    createControlTree(state?: any, input?: ControlInput): TestControl {
        return TestControl.getInstance();
    }
}

class TestControl extends ContainerControl {
    private static instance = new TestControl();

    lastKnownModality: OutputModality | undefined = undefined;

    private constructor() {
        super({ id: 'TestControl' });
    }

    async canHandle(input: ControlInput): Promise<boolean> {
        this.lastKnownModality = input.suggestedResponseStyle.modality;
        return true;
    }

    async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        // Do nothing
    }

    static getInstance() {
        return this.instance;
    }
}
