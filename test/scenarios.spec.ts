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

import { expect } from 'chai';
import { suite, test } from 'mocha';
import sinon from 'sinon';
import { IntentRequest, interfaces } from 'ask-sdk-model';
import UserEvent = interfaces.alexa.presentation.apl.UserEvent;
import { getSupportedInterfaces } from 'ask-sdk-core';
import {
    AmazonBuiltInSlotType,
    ControlHandler,
    DateControl,
    InputUtil,
    IntentBuilder,
    ListControl,
    Logger,
    SimplifiedIntent,
    SkillInvoker,
    wrapRequestHandlerAsSkill,
} from '../src';
import { AplContent, AplContentFunc, NumberControl } from '../src/commonControls/numberControl/NumberControl';
import { ValueControl } from '../src/commonControls/ValueControl';
import { Strings as $ } from '../src/constants/Strings';
import { ContainerControl } from '../src/controls/ContainerControl';
import { Control } from '../src/controls/Control';
import { ControlInput } from '../src/controls/ControlInput';
import { ControlManager } from '../src/controls/ControlManager';
import { ControlResultBuilder } from '../src/controls/ControlResult';
import { GeneralControlIntent } from '../src/intents/GeneralControlIntent';
import { ValueControlIntent, unpackValueControlIntent } from '../src/intents/ValueControlIntent';
import { SessionBehavior } from '../src/runtime/SessionBehavior';
import { ValueChangedAct, ValueSetAct } from '../src/systemActs/ContentActs';
import { RequestChangedValueAct, RequestValueAct } from '../src/systemActs/InitiativeActs';
import { SystemAct } from '../src/systemActs/SystemAct';
import {
    findControlInTreeById,
    simpleInvoke,
    TestInput,
    waitForDebugger,
} from '../src/utils/testSupport/TestingUtils';
import { GameStrings as $$ } from './game_strings';
import { ListControlAPLPropsBuiltIns } from '../src/commonControls/listControl/ListControlAPL';
import { NumberControlAPLPropsBuiltIns } from '../src/commonControls/numberControl/NumberControlAPL';

waitForDebugger();

suite('== Single value selector scenarios ==', () => {
    class SingleSelectorManager extends ControlManager {
        createControlTree(): Control {
            const topControl = new ContainerControl({ id: 'root' });
            topControl.addChild(
                new ValueControl({
                    id: $$.ID.PlayerName,
                    slotType: 'CUSTOM.name',
                    prompts: { requestValue: 'none' },
                    interactionModel: { targets: [$$.Target.Name] },
                }),
            );

            return topControl;
        }
    }
    test('simple set-value input should be processed.', async () => {
        // Note: this test demonstrates calling handle() on a single control (yielding a ControlResult)

        const rootControl = new SingleSelectorManager().createControlTree();
        const input = TestInput.of(
            ValueControlIntent.of('CUSTOM.name', {
                action: $.Action.Set,
                target: $$.Target.Name,
                'CUSTOM.name': 'Mike',
            }),
        );
        const result = new ControlResultBuilder(undefined!);
        await rootControl.canHandle(input);
        await rootControl.handle(input, result);
        const playerNameState = findControlInTreeById(rootControl, $$.ID.PlayerName);
        expect(playerNameState.state.value).eq('Mike');
        expect(result.acts).length(1);
        expect(result.acts[0]).instanceOf(ValueSetAct);
    });

    test('valueType mismatch should cause processing to throw', async () => {
        const rootControl = new SingleSelectorManager().createControlTree();
        const input = TestInput.of(
            ValueControlIntent.of('AMAZON.Number', {
                action: $.Action.Set,
                target: $$.Target.Name,
                'AMAZON.Number': 'Mike',
            }),
        );
        expect(async () => {
            await rootControl.handle(input, new ControlResultBuilder(undefined!));
        }).throws;
    });

    test('session ending due to lack of initiative', async () => {
        const rootControl = new SingleSelectorManager().createControlTree();
        const input = TestInput.of(
            ValueControlIntent.of('CUSTOM.name', {
                action: $.Action.Set,
                target: $$.Target.Name,
                'CUSTOM.name': 'Mike',
            }),
        );
        const result = await simpleInvoke(rootControl, input);
        expect(result.acts[0]).instanceOf(ValueSetAct);
        expect(result.sessionBehavior).equals(SessionBehavior.OPEN);
    });
});

suite(
    '== Two controls that collect numbers. One is ValueControl{AMAZON.NUMBER} and other is NumberControl ==',
    () => {
        const PLAYER_COUNT = 'playerCount'; // used for both controlID and target.
        const PLAYER_AGE = 'playerAge'; // used for both controlID and target.

        class TwoSelectorManager extends ControlManager {
            createControlTree(state?: any, input?: ControlInput): Control {
                const rootControl = new ContainerControl({ id: 'root' });

                rootControl
                    .addChild(
                        new ValueControl({
                            id: PLAYER_COUNT,
                            slotType: 'AMAZON.NUMBER',
                            prompts: { requestValue: 'none' },
                            interactionModel: { targets: [PLAYER_COUNT] },
                        }),
                    )
                    .addChild(
                        new NumberControl({
                            id: PLAYER_AGE,
                            prompts: { requestValue: 'none' },
                            interactionModel: { targets: [PLAYER_AGE] },
                        }),
                    );

                return rootControl;
            }
        }

        test('U: set count, A: move focus and ask question', async () => {
            // Note: this test demonstrates calling simpleInvoke() which includes the initiative phase (yielding a composite ControlResult)

            const rootControl = new TwoSelectorManager().createControlTree();
            const input = TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    action: $.Action.Set,
                    target: PLAYER_COUNT,
                    'AMAZON.NUMBER': '3',
                }),
            );
            const result = await simpleInvoke(rootControl, input);
            const playerCountState = findControlInTreeById(rootControl, PLAYER_COUNT);
            expect(playerCountState.state.value).eq('3');
            expect(result.acts[0]).instanceOf(ValueSetAct);
            expect(result.acts[1]).instanceOf(RequestValueAct);
        });

        test('U: set count, A:move focus and ask question, U: change count to specific value', async () => {
            const rootControl = new TwoSelectorManager().createControlTree();

            // -- turn 1
            const input1 = TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    action: $.Action.Set,
                    target: PLAYER_COUNT,
                    'AMAZON.NUMBER': '3',
                }),
            );
            const result1 = await simpleInvoke(rootControl, input1);

            expect(result1.acts).length(2);
            expect((result1.acts[1] as SystemAct).control.id).eq(PLAYER_AGE); // <-- ask for age

            // -- turn 2
            const request2 = TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    action: $.Action.Change,
                    target: PLAYER_COUNT,
                    'AMAZON.NUMBER': '4',
                }),
            );
            const result2 = await simpleInvoke(rootControl, request2);

            const playerCountState = findControlInTreeById(rootControl, PLAYER_COUNT);
            expect(playerCountState.state.value).eq('4'); // <--- changed successfully
            expect(result2.acts[0]).instanceOf(ValueChangedAct); // <--- appropriate feedback act
            expect(result2.acts[1]).instanceOf(RequestValueAct); // <-- ask for age again.
            expect((result2.acts[1] as SystemAct).control.id).eq(PLAYER_AGE); // <-- ask for age again.
        });

        test('U: set count, A:move focus and ask question, U: change count, A: request value, U: give value (multi-step set)', async () => {
            const rootControl = new TwoSelectorManager().createControlTree();

            // -- turn 1
            const input1 = TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, {
                    action: $.Action.Set,
                    target: PLAYER_COUNT,
                    'AMAZON.NUMBER': '3',
                }),
            );
            const result1 = await simpleInvoke(rootControl, input1);
            expect(result1.acts).length(2);
            expect(result1.acts[1]).instanceof(RequestValueAct);

            // -- turn 2
            const input2 = TestInput.of(
                GeneralControlIntent.of({ action: $.Action.Change, target: PLAYER_COUNT }),
            );
            const result2 = await simpleInvoke(rootControl, input2);
            expect(result2.acts[0]).instanceOf(RequestChangedValueAct);
            expect((result2.acts[0] as SystemAct).control.id).eq(PLAYER_COUNT);

            // -- turn 3
            const input3 = TestInput.of(
                ValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, { 'AMAZON.NUMBER': '4' }),
            );
            const result3 = await simpleInvoke(rootControl, input3);

            expect(result3.acts[0]).instanceOf(ValueChangedAct);
            expect((result3.acts[0] as SystemAct).control.id).eq(PLAYER_COUNT);
            expect(result3.acts[1]).instanceOf(RequestValueAct);
            expect((result3.acts[1] as SystemAct).control.id === PLAYER_AGE);
        });
    },
);

suite('== Custom Handler function scenarios ==', () => {
    class DateSelectorManager extends ControlManager {
        createControlTree(): Control {
            const topControl = new ContainerControl({ id: 'root' });

            // DateControl
            const dateControl = new DateControl({
                id: 'dateControl',
                interactionModel: {
                    targets: [$.Target.Date],
                    actions: {
                        set: [$.Action.Set],
                        change: [$.Action.Change],
                    },
                },
                inputHandling: {
                    customHandlingFuncs: [
                        {
                            name: 'custom::setDateEvent',
                            canHandle: isSetDateEvent,
                            handle: handleSetDateEvent,
                        },
                        { name: 'custom::setValue', canHandle: isSetValue, handle: handleSetValue },
                    ],
                },
            });

            function isSetDateEvent(input: ControlInput) {
                return InputUtil.isIntent(input, 'SetDateEventIntent');
            }

            function handleSetDateEvent(input: ControlInput) {
                const intent = SimplifiedIntent.fromIntent((input.request as IntentRequest).intent);
                if (intent.slotResolutions.date !== undefined) {
                    const dateValue = intent.slotResolutions.date;
                    dateControl.setValue(dateValue.slotValue);
                }
            }

            function isSetValue(input: ControlInput) {
                return InputUtil.isValueControlIntent(input, AmazonBuiltInSlotType.DATE);
            }

            function handleSetValue(input: ControlInput) {
                const { values } = unpackValueControlIntent((input.request as IntentRequest).intent);
                const valueStr = values[0];
                dateControl.setValue(valueStr.slotValue);
            }

            topControl.addChild(dateControl);
            return topControl;
        }
    }

    test('Check custom handlers are invoked.', async () => {
        // Note: this test demonstrates calling customHandlingFuncs if defined on a control

        const rootControl = new DateSelectorManager().createControlTree();
        const input = TestInput.of(
            IntentBuilder.of('SetDateEventIntent', {
                date: '2020-01-01',
            }),
        );
        const result = new ControlResultBuilder(undefined!);
        await rootControl.canHandle(input);
        await rootControl.handle(input, result);
        const dateControlState = findControlInTreeById(rootControl, 'dateControl');
        expect(dateControlState.state.value).eq('2020-01-01');
    });

    test('Check conflicts in canHandle throws a warn log', async () => {
        const rootControl = new DateSelectorManager().createControlTree();
        const input = TestInput.of(
            ValueControlIntent.of(AmazonBuiltInSlotType.DATE, {
                'AMAZON.DATE': '2018',
                action: $.Action.Set,
            }),
        );
        const spy = sinon.stub(Logger.prototype, 'warn');
        const result = new ControlResultBuilder(undefined!);
        await rootControl.canHandle(input);
        await rootControl.handle(input, result);

        expect(
            spy.calledOnceWith(
                'Custom canHandle function and built-in canHandle function both returned true. Turn on debug logging for more information',
            ),
        ).eq(true);

        spy.restore();

        const dateControlState = findControlInTreeById(rootControl, 'dateControl');
        expect(dateControlState.state.value).eq('2018');
        expect(result.acts).length(1);
        expect(result.acts[0]).instanceOf(ValueSetAct);
    });
});

suite('== Custom List APL Props ==', () => {
    class ListSelector extends ControlManager {
        createControlTree(): Control {
            const topControl = new ContainerControl({ id: 'root' });

            // ListControl
            const houseControl = new ListControl({
                id: 'hogwarts',
                listItemIDs: getCategoriesList(),
                slotType: 'hogwartsHouse',
                validation: [
                    (state, input) =>
                        getCategoriesList().includes(state.value!)
                            ? true
                            : { renderedReason: 'houseControl validation Failed' },
                ],
                apl: {
                    requestValue: {
                        customHandlingFuncs: [
                            { canHandle: isButtonSelected, handle: handleButtonSelection },
                            { canHandle: isHouseSelected, handle: handleHouseSelection },
                        ],
                    },
                },
                valueRenderer: (x: string, input) => `Wizard House: ${x}`,
            });

            function getCategoriesList(): string[] {
                return ['Gryffindor', 'Ravenclaw', 'Slytherin'];
            }

            function isButtonSelected(input: ControlInput): boolean {
                return InputUtil.isAPLUserEventWithMatchingSourceId(input, 'HouseTextButton');
            }

            async function handleButtonSelection(input: ControlInput, resultBuilder: ControlResultBuilder) {
                const houseId = (input.request as interfaces.alexa.presentation.apl.UserEvent).arguments![0];
                houseControl.setValue(houseId, true);
                await houseControl.validateAndAddActs(input, resultBuilder, $.Action.Set);
            }

            function isHouseSelected(input: ControlInput) {
                return InputUtil.isIntent(input, 'HouseSelectionIntent');
            }

            async function handleHouseSelection(input: ControlInput, resultBuilder: ControlResultBuilder) {
                if (getSupportedInterfaces(input.handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                    const intent = SimplifiedIntent.fromIntent((input.request as IntentRequest).intent);
                    if (intent.slotResolutions.value !== undefined) {
                        const listSelectedValue = intent.slotResolutions.value;
                        houseControl.setValue(listSelectedValue.slotValue);
                        await houseControl.validateAndAddActs(input, resultBuilder, $.Action.Set);
                    }
                }
            }
            topControl.addChild(houseControl);
            return topControl;
        }
    }

    test('APL custom handlers are invoked.', async () => {
        // Note: this test demonstrates calling customHandlingFuncs if defined on a control

        const rootControl = new ListSelector().createControlTree();
        const input = TestInput.of(
            IntentBuilder.of('HouseSelectionIntent', {
                value: 'Hufflepuff',
            }),
        );
        const result = new ControlResultBuilder(undefined!);
        await rootControl.canHandle(input);
        await rootControl.handle(input, result);
        const houseControlState = findControlInTreeById(rootControl, 'hogwarts');
        expect(houseControlState.state.value).eq('Hufflepuff');
    });

    test('APL custom mapper for slotIds.', async () => {
        const requestHandler = new ControlHandler(new ListSelector());
        const skill = new SkillInvoker(wrapRequestHandlerAsSkill(requestHandler));
        const testUserEvent: UserEvent = {
            type: 'Alexa.Presentation.APL.UserEvent',
            requestId: 'amzn1.echo-api.request.1',
            timestamp: '2019-10-04T18:48:22Z',
            locale: 'en-US',
            arguments: ['Muggle'],
            components: {},
            source: {
                type: 'TouchWrapper',
                handler: 'Press',
                id: 'HouseTextButton',
            },
            token: 'houseButtonToken',
        };
        const expectedDataSource = {
            textListData: {
                controlId: 'hogwarts',
                headerTitle: 'Please select...',
                items: [
                    {
                        primaryText: 'Wizard House: Gryffindor',
                    },
                    {
                        primaryText: 'Wizard House: Ravenclaw',
                    },
                    {
                        primaryText: 'Wizard House: Slytherin',
                    },
                ],
            },
        };
        const response = await skill.invoke(TestInput.userEvent(testUserEvent));
        const dataSource = (response as any).directive[0].datasources;

        expect(response.directive?.length).eq(1);
        expect(response.prompt).eq(
            'Sorry, Wizard House: Muggle is not a valid choice because houseControl validation Failed. What is your selection? Some suggestions are Wizard House: Gryffindor, Wizard House: Ravenclaw or Wizard House: Slytherin.',
        );
        expect(dataSource).deep.equals(expectedDataSource);
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

            const validationFailedMessage = 'The value must be even.';
            // NumberControl
            const numberControl: NumberControl = new NumberControl({
                id: 'numItems',
                validation: [
                    (state) => state.value! % 2 === 0 || { renderedReason: 'the value must be even' },
                ],
                apl: {
                    validationFailedMessage,
                },
            });

            topControl.addChild(numberControl);
            return topControl;
        }
    }

    test('APL dataSource sends custom validationFailedMessage.', async () => {
        // Note: this test demonstrates the validationFailedMessage is correctly passed in the dataSource along with isValidValue

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
                isValidValue: false,
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
