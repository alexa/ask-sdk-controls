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

import { expect } from 'chai';
import { suite, test } from 'mocha';
import {
    MultiValueListControl,
    MultiValueListStateValue,
    MultiValueValidationFailure,
} from '../../src/commonControls/multiValueListControl/MultiValueListControl';
import { Strings as $ } from '../../src/constants/Strings';
import { Control } from '../../src/controls/Control';
import { ControlManager } from '../../src/controls/ControlManager';
import { AmazonIntent } from '../../src/intents/AmazonBuiltInIntent';
import { GeneralControlIntent } from '../../src/intents/GeneralControlIntent';
import { ValueControlIntent } from '../../src/intents/ValueControlIntent';
import { ControlHandler } from '../../src/runtime/ControlHandler';
import { IntentBuilder } from '../../src/utils/IntentUtils';
import { SkillInvoker } from '../../src/utils/testSupport/SkillInvoker';
import { testE2E, TestInput, testTurn, waitForDebugger } from '../../src/utils/testSupport/TestingUtils';

waitForDebugger();

suite('MultiValueListControl e2e tests', () => {
    class CategorySuiteManager extends ControlManager {
        createControlTree(): Control {
            const categoryControl = new MultiValueListControl({
                id: 'apple',
                validation: validateProducts,
                listItemIDs: getProductList,
                slotType: 'AppleSuite',
                confirmationRequired: true,
                prompts: {
                    confirmValue: 'Is that all?',
                },
            });

            function getProductList() {
                return ['AirPods', 'iWatch', 'iPhone', 'iPad', 'MacBook'];
            }

            function validateProducts(
                values: MultiValueListStateValue[],
            ): true | MultiValueValidationFailure {
                const invalidValues = [];
                for (const product of values) {
                    if (getProductList().includes(product.id) !== true) {
                        invalidValues.push(product.id);
                    }
                }
                if (invalidValues.length > 0) {
                    return {
                        invalidValues,
                        renderedReason: 'item is not available in the product list',
                    };
                }
                return true;
            }

            return categoryControl;
        }
    }

    suite('CategorySuiteManager e2e tests', () => {
        test('Add multiple items with an invalid value', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            await testE2E(requestHandler, [
                'U: add iPhone and iPac',
                TestInput.of(
                    ValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPhone', 'iPac'],
                        action: $.Action.Add,
                    }),
                ),
                "A: OK, added iPhone. Sorry, iPac can't be added as item is not available in the product list. Is that all?",
                'U: Yeah.',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great.',
            ]);

            expect(requestHandler.getSerializableControlStates().apple.value).deep.equals([
                { id: 'iPhone', erMatch: false },
            ]);
        });

        test('Add multiple invalid values, elicit a value from control', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            await testE2E(requestHandler, [
                'U: add iPod and iPac',
                TestInput.of(
                    ValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPod', 'iPac'],
                        action: $.Action.Add,
                    }),
                ),
                "A:  Sorry, iPod and iPac can't be added as item is not available in the product list. What is your selection? Some suggestions are AirPods, iWatch or iPhone.",
            ]);

            expect(requestHandler.getSerializableControlStates().apple.value === undefined);
        });

        test('Bare values support', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            await testE2E(requestHandler, [
                'U: add iPhone and iPac',
                TestInput.of(
                    ValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPhone', 'iPac'],
                        action: $.Action.Add,
                    }),
                ),
                "A: OK, added iPhone. Sorry, iPac can't be added as item is not available in the product list. Is that all?",
                'U: iPad',
                TestInput.of(ValueControlIntent.of('AppleSuite', { AppleSuite: 'iPad' })),
                'A: OK, added iPad. Is that all?',
                'U: Yeah.',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great.',
            ]);
            expect(requestHandler.getSerializableControlStates().apple.value).deep.equals([
                { id: 'iPhone', erMatch: false },
                { id: 'iPad', erMatch: false },
            ]);
        });

        test('Negative prompts and removal of items', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            await testE2E(requestHandler, [
                'U: add iPhone and AirPods',
                TestInput.of(
                    ValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPhone', 'AirPods'],
                        action: $.Action.Add,
                    }),
                ),
                'A: OK, added iPhone and AirPods. Is that all?',
                'U: No',
                TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
                'A: You can add new values or update existing values',
                'U: Remove iPods and AirPods',
                TestInput.of(
                    ValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPods', 'AirPods'],
                        action: $.Action.Remove,
                    }),
                ),
                'A: OK, removed AirPods. Sorry, iPods is not in the list. What value do you want to remove? Some suggestions are iPhone.',
                'U: Remove iPhone',
                TestInput.of(
                    ValueControlIntent.of('AppleSuite', {
                        AppleSuite: 'iPhone',
                        action: $.Action.Remove,
                    }),
                ),
                'A: OK, removed iPhone. What is your selection? Some suggestions are AirPods, iWatch or iPhone.',
            ]);

            expect(requestHandler.getSerializableControlStates().apple.value === undefined);
        });

        test('Remove all items from cart', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            await testE2E(requestHandler, [
                'U: add iPhone and iPad',
                TestInput.of(
                    ValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPhone', 'iPad'],
                        action: $.Action.Add,
                    }),
                ),
                'A: OK, added iPhone and iPad. Is that all?',
                'U: AirPods',
                TestInput.of(ValueControlIntent.of('AppleSuite', { AppleSuite: 'AirPods' })),
                'A: OK, added AirPods. Is that all?',
                'U: Clear all items from cart',
                TestInput.of(GeneralControlIntent.of({ action: $.Action.Clear })),
                'A: OK, removed iPhone, iPad and AirPods from the list. What is your selection? Some suggestions are AirPods, iWatch or iPhone.',
                'U: Remove iPhone',
                TestInput.of(
                    ValueControlIntent.of('AppleSuite', {
                        AppleSuite: 'iPhone',
                        action: $.Action.Remove,
                    }),
                ),
                'A: Sorry, iPhone is not in the list. What value do you want to remove?',
            ]);

            expect(requestHandler.getSerializableControlStates().apple.value === undefined);
        });

        test('Duplicate value scenarios', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            await testE2E(requestHandler, [
                'U: add iPhone and iPhone',
                TestInput.of(
                    ValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPhone', 'iPhone'],
                        action: $.Action.Add,
                    }),
                ),
                'A: OK, added iPhone and iPhone. Is that all?',
                'U: iPhone',
                TestInput.of(ValueControlIntent.of('AppleSuite', { AppleSuite: 'iPhone' })),
                'A: OK, added iPhone. Is that all?',
                'U: Remove iPhone',
                TestInput.of(
                    ValueControlIntent.of('AppleSuite', {
                        AppleSuite: 'iPhone',
                        action: $.Action.Remove,
                    }),
                ),
                'A: OK, removed iPhone. Is that all?',
            ]);

            expect(requestHandler.getSerializableControlStates().apple.value).deep.equals([
                { id: 'iPhone', erMatch: false },
                { id: 'iPhone', erMatch: false },
            ]);
        });

        test('Select by touch', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            const invoker = new SkillInvoker(requestHandler);
            await testTurn(
                invoker,
                'U: _',
                TestInput.simpleUserEvent(['apple', 'Select', 1]),
                'A: OK, added AirPods. Is that all?',
            );

            const response = await testTurn(
                invoker,
                'U: _',
                TestInput.simpleUserEvent(['apple', 'Select', 3]),
                'A: OK, added iPhone. Is that all?',
            );

            expect(response.directive !== undefined); // APL re-renders with updated selected list

            expect(requestHandler.getSerializableControlStates().apple.value).deep.equals([
                { id: 'AirPods', erMatch: true },
                { id: 'iPhone', erMatch: true },
            ]);

            await testTurn(
                invoker,
                'U: _',
                TestInput.simpleUserEvent(['apple', 'Remove', 1]),
                'A: OK, removed AirPods. Is that all?',
            );

            expect(requestHandler.getSerializableControlStates().apple.value).deep.equals([
                { id: 'iPhone', erMatch: true },
            ]);

            await testTurn(
                invoker,
                'U: <touch Event Done button>',
                TestInput.simpleUserEvent(['apple', 'Complete']),
                'A: ', //<next initiative>
            );
            expect(requestHandler.getSerializableControlStates().apple.confirmed).equal(true); // Submit button on APL confirms all selected values.
        });
    });
});
