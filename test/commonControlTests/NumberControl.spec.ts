/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License').
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the 'license' file accompanying this file. This file is distributed
 * on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { interfaces } from 'ask-sdk-model';
import { expect } from 'chai';
import { suite, test } from 'mocha';
import {
    AmazonBuiltInSlotType,
    AmazonIntent,
    ContainerControl,
    GeneralControlIntent,
    IntentBuilder,
    SkillInvoker,
    wrapRequestHandlerAsSkill,
} from '../../src';
import { NumberControl } from '../../src/commonControls/numberControl/NumberControl';
import { Strings as $ } from '../../src/constants/Strings';
import { Control } from '../../src/controls/Control';
import { ControlManager } from '../../src/controls/ControlManager';
import { ValueControlIntent } from '../../src/intents/ValueControlIntent';
import { ControlHandler } from '../../src/runtime/ControlHandler';
import { testE2E, TestInput, waitForDebugger } from '../../src/utils/testSupport/TestingUtils';
import UserEvent = interfaces.alexa.presentation.apl.UserEvent;

waitForDebugger();

suite('NumberControl e2e tests', () => {
    class AgeControlManager extends ControlManager {
        createControlTree(): Control {
            return new NumberControl({
                id: 'ageSelector',
                prompts: {
                    requestValue: () => ['How old will you be?'],
                    valueSet: 'Great.',
                    valueChanged: (act) => `Ok, I've updated your age to ${act.payload.value}`,
                },
                confirmationRequired: (state, input) =>
                    state.value !== undefined && (state.value < 10 || state.value > 20),
                validation: [
                    (state) => state.value > 0 || { renderedReason: 'the age must be positive' },
                    (state) => state.value % 2 === 0 || { renderedReason: 'the age must be even' },
                ],
            });
        }
    }

    test('set value with a valid input', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: set my age to sixteen',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '16',
                    action: $.Action.Set,
                }),
            ),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(16);
    });

    test('indicate set action without providing input', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: set my age',
            TestInput.of(GeneralControlIntent.of({ action: $.Action.Set })),
            'A: How old will you be?',
            'U: set it to twelve',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '12',
                    action: $.Action.Set,
                }),
            ),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(12);
    });

    test('change age to different value', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: change my age to twenty',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '20',
                    action: $.Action.Change,
                }),
            ),
            "A: Ok, I've updated your age to 20",
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(20);
    });

    test('indicate change action without input', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: change my age',
            TestInput.of(GeneralControlIntent.of({ action: $.Action.Change })),
            'A: How old will you be?',
            'U: change it to eighteen',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '18',
                    action: $.Action.Change,
                }),
            ),
            "A: Ok, I've updated your age to 18",
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(18);
    });

    test('Bare value support', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: set my age',
            TestInput.of(GeneralControlIntent.of({ action: $.Action.Set })),
            'A: How old will you be?',
            'U: twelve',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '12',
                }),
            ),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(12);
    });

    test('Input value needs explicit confirmation', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: set my age to six',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '6',
                    action: $.Action.Set,
                }),
            ),
            'A: Was that 6?',
            'U: yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(6);
    });

    test('change age value with explicit confirmation', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: change my age to four',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '4',
                    action: $.Action.Change,
                }),
            ),
            'A: Was that 4?',
            'U: yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(4);
    });

    test('change age value with explicit disaffirmation and no suggestion available', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: change my age to five',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '5',
                    action: $.Action.Change,
                }),
            ),
            'A: Was that 5?',
            'U: No',
            TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
            'A: My mistake. How old will you be?',
            'U: twelve',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '12',
                }),
            ),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(12);
    });

    test('set age with disaffirmation and explicit confirmation later', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: set my age',
            TestInput.of(GeneralControlIntent.of({ action: $.Action.Set })),
            'A: How old will you be?',
            'U: twenty-four',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '24',
                }),
            ),
            'A: Was that 24?',
            'U: No',
            TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
            'A: My mistake. How old will you be?',
            'U: forty',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '40',
                }),
            ),
            'A: Was that 40?',
            'U: Yep',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(40);
    });

    test('Input value fail validation check', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: set my age to five',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '5',
                    action: $.Action.Set,
                }),
            ),
            'A: Was that 5?',
            'U: yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            "A: Sorry but that's not a valid choice because the age must be even. How old will you be?",
            'U: fourteen',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '14',
                }),
            ),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(14);
    });

    test('Clear the value on Number Control', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: set my age to four',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '4',
                    action: $.Action.Set,
                }),
            ),
            'A: Was that 4?',
            'U: yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
            'U: Clear my age',
            TestInput.of(GeneralControlIntent.of({ action: $.Action.Clear })),
            'A: Ok, cleared. How old will you be?',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(undefined);
    });

    test('APL screen input, no confirmation', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: set my age',
            TestInput.of(GeneralControlIntent.of({ action: $.Action.Set })),
            'A: How old will you be?',
            'U: <APL Touch>',
            TestInput.simpleUserEvent(['ageSelector', 40]),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(40);
    });

    test('APL screen input is invalid, set to a new valid value', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: set my age',
            TestInput.of(GeneralControlIntent.of({ action: $.Action.Set })),
            'A: How old will you be?',
            'U: <APL Touch>',
            TestInput.simpleUserEvent(['ageSelector', 3]),
            "A: Sorry but that's not a valid choice because the age must be even. How old will you be?",
            'U: fourteen',
            TestInput.of(ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, { 'AMAZON.NUMBER': '14' })),
            'A: Great.',
        ]);
    });

    test('set age value with explicit disaffirmation and suggestions', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: set my age to one hundred and thirteen',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '113',
                    action: $.Action.Set,
                }),
            ),
            'A: Was that 113?',
            'U: No',
            TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
            'A: My mistake. Did you perhaps mean 130?',
            'U: yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(130);
    });

    test('change age value with explicit disaffirmation and suggestions', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: change my age to one hundred and thirteen',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '113',
                    action: $.Action.Change,
                }),
            ),
            'A: Was that 113?',
            'U: No',
            TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
            'A: My mistake. Did you perhaps mean 130?',
            'U: no',
            TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
            'A: My mistake. How old will you be?',
            'U: twelve',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '12',
                }),
            ),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(12);
    });

    test('change age value with explicit disaffirmation with values', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: change my age to one hundred and thirteen',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '113',
                    action: $.Action.Change,
                }),
            ),
            'A: Was that 113?',
            'U: No',
            TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
            'A: My mistake. Did you perhaps mean 130?',
            'U: no, fifty',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '50',
                    feedback: $.Feedback.Disaffirm,
                }),
            ),
            'A: My mistake. Was that 50?',
            'U: yes, 50',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '50',
                    feedback: $.Feedback.Affirm,
                }),
            ),
            'A: Great.',
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(50);
    });

    test('change age value with explicit confirmations along with another value', async () => {
        const requestHandler = new ControlHandler(new AgeControlManager());
        await testE2E(requestHandler, [
            'U: change my age to one hundred and thirteen',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '113',
                    action: $.Action.Change,
                }),
            ),
            'A: Was that 113?',
            'U: No',
            TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
            'A: My mistake. Did you perhaps mean 130?',
            'U: no, fifty-one',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '51',
                    feedback: $.Feedback.Disaffirm,
                }),
            ),
            'A: My mistake. Was that 51?',
            'U: yes, 51',
            TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    'AMAZON.NUMBER': '51',
                    feedback: $.Feedback.Affirm,
                }),
            ),
            "A: Great. Sorry but that's not a valid choice because the age must be even. How old will you be?",
        ]);
        expect(requestHandler.getSerializableControlStates().ageSelector.value).eq(51);
    });
});

/**
 * TODO: test cases
 *  - NumberControl APL custom handlers
 *  - NumberControl custom requestValue and requestChangedValue as functions
 *  - QuestionnaireControl custom askQuestion as function
 */
suite('== Custom Number APL Props ==', () => {
    class NumberTestControlManager extends ControlManager {
        createControlTree(): Control {
            const topControl = new ContainerControl({ id: 'root' });

            // NumberControl
            const numberControl: NumberControl = new NumberControl({
                id: 'numItems',
                validation: [
                    (state) => state.value! % 2 === 0 || { renderedReason: 'the value must be even' },
                ],
                apl: {
                    validationFailedMessage: 'The value must be even.',
                },
            });

            topControl.addChild(numberControl);
            return topControl;
        }
    }

    test('APL dataSource sends custom validationFailedMessage.', async () => {
        // Note: this test demonstrates the validationFailedMessage is correctly passed in the dataSource
        const requestHandler = new ControlHandler(new NumberTestControlManager());
        const skill = new SkillInvoker(wrapRequestHandlerAsSkill(requestHandler));
        const testUserEvent: UserEvent = {
            type: 'Alexa.Presentation.APL.UserEvent',
            requestId: 'amzn1.echo-api.request.1',
            timestamp: '2019-10-04T18:48:22Z',
            locale: 'en-US',
            arguments: ['numItems', 3],
            components: {},
            source: {
                type: 'EditText',
                id: 'editTextNumber',
            },
            token: 'token',
        };
        const expectedDataSource = {
            numPadData: {
                controlId: 'numItems',
                headerTitle: 'Enter a number...',
                validationFailedMessage: 'The value must be even.',
            },
        };
        const response = await skill.invoke(TestInput.userEvent(testUserEvent));
        expect(response.directive?.length).eq(2);
        expect((response as any).directive[0].type).eq('Dialog.ElicitSlot');
        expect((response as any).directive[0].slotToElicit).eq('AMAZON.NUMBER');
        const dataSource = (response as any).directive[1].datasources;

        expect(response.prompt).eq(
            "Sorry but that's not a valid choice because the value must be even. What number?",
        );
        expect(dataSource).deep.equals(expectedDataSource);
    });
});
