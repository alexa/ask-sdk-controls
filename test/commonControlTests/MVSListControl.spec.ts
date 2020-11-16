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

import { suite, test } from 'mocha';
import {
    MVSListControl,
    MVSListControlState,
    MVSValidationResult,
} from '../../src/commonControls/listControl/MVSListControl';
import { Strings as $ } from '../../src/constants/Strings';
import { Control } from '../../src/controls/Control';
import { ControlManager } from '../../src/controls/ControlManager';
import { AmazonIntent } from '../../src/intents/AmazonBuiltInIntent';
import { MultiValueControlIntent } from '../../src/intents/MultiValueControlIntent';
import { ControlHandler } from '../../src/runtime/ControlHandler';
import { IntentBuilder } from '../../src/utils/IntentUtils';
import { testE2E, TestInput, waitForDebugger } from '../../src/utils/testSupport/TestingUtils';

waitForDebugger();

suite('MVSListControl e2e tests', () => {
    class MVSListControlManager extends ControlManager {
        createControlTree(): Control {
            const categoryControl = new MVSListControl({
                id: 'apple',
                validation: validateProducts,
                listItemIDs: getProductList,
                slotType: 'AppleSuite',
                confirmationRequired: true,
            });

            function getProductList() {
                return ['AirPods', 'iWatch', 'iPhone', 'iPad', 'MacBook'];
            }

            function validateProducts(state: MVSListControlState): true | MVSValidationResult {
                for (const product of state.value!) {
                    if (getProductList().includes(product.id) !== true) {
                        return {
                            renderedReason: 'Apple Suite category validation failed',
                            invalidValue: product.id,
                        };
                    }
                }
                return true;
            }

            return categoryControl;
        }
    }

    test('Add multiple items with an invalid value', async () => {
        const requestHandler = new ControlHandler(new MVSListControlManager());
        await testE2E(requestHandler, [
            'U: add iPhone and iPac',
            TestInput.of(
                MultiValueControlIntent.of('AppleSuite', {
                    AppleSuite: ['iPhone', 'iPac'],
                    action: $.Action.Add,
                }),
            ),
            'A: Was that iPhone and iPac?',
            'U: Yeah.',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great. Sorry, iPac is not a valid choice because Apple Suite category validation failed. What should I change it to? Some suggestions are AirPods, iWatch or iPhone.',
        ]);
    });

    test('Add multiple items on confirmation prompt', async () => {
        const requestHandler = new ControlHandler(new MVSListControlManager());
        await testE2E(requestHandler, [
            'U: add iPhone and MacBook',
            TestInput.of(
                MultiValueControlIntent.of('AppleSuite', {
                    AppleSuite: ['iPhone', 'MacBook'],
                    action: $.Action.Add,
                }),
            ),
            'A: Was that iPhone and MacBook?',
            'U: Yeah.',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
            'U: add iPac',
            TestInput.of(
                MultiValueControlIntent.of('AppleSuite', { AppleSuite: ['iPac'], action: $.Action.Add }),
            ),
            'A: Was that iPac?',
            'U: Yeah.',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great. Sorry, iPac is not a valid choice because Apple Suite category validation failed. What should I change it to? Some suggestions are AirPods, iWatch or iPhone.',
            'U: AirPods and iWatch', //replacement for iPac and additional value
            TestInput.of(MultiValueControlIntent.of('AppleSuite', { AppleSuite: ['AirPods', 'iWatch'] })),
            'A: Was that AirPods and iWatch?',
            'U: Yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        ]);
    });

    test('Bare Values support to change invalid values', async () => {
        const requestHandler = new ControlHandler(new MVSListControlManager());
        await testE2E(requestHandler, [
            'U: add iPhone and iPac',
            TestInput.of(
                MultiValueControlIntent.of('AppleSuite', {
                    AppleSuite: ['iPhone', 'iPac'],
                    action: $.Action.Add,
                }),
            ),
            'A: Was that iPhone and iPac?',
            'U: Yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great. Sorry, iPac is not a valid choice because Apple Suite category validation failed. What should I change it to? Some suggestions are AirPods, iWatch or iPhone.',
            'U: AirPods', //replacement for iPac
            TestInput.of(MultiValueControlIntent.of('AppleSuite', { AppleSuite: ['AirPods'] })),
            'A: Was that AirPods?',
            'U: Yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        ]);
    });

    test('Add multiple items and provide replacements', async () => {
        const requestHandler = new ControlHandler(new MVSListControlManager());
        await testE2E(requestHandler, [
            'U: add iPhone and iPac',
            TestInput.of(
                MultiValueControlIntent.of('AppleSuite', {
                    AppleSuite: ['iPhone', 'iPac'],
                    action: $.Action.Add,
                }),
            ),
            'A: Was that iPhone and iPac?',
            'U: Add iPod.',
            TestInput.of(
                MultiValueControlIntent.of('AppleSuite', {
                    AppleSuite: ['iPod'],
                    action: $.Action.Add,
                }),
            ),
            'A: Was that iPhone, iPac and iPod?',
            'U: Yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great. Sorry, iPac is not a valid choice because Apple Suite category validation failed. What should I change it to? Some suggestions are AirPods, iWatch or iPhone.',
            'U: AirPods', //replacement for iPac
            TestInput.of(MultiValueControlIntent.of('AppleSuite', { AppleSuite: ['AirPods'] })),
            'A: Was that AirPods?',
            'U: Yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great. Sorry, iPod is not a valid choice because Apple Suite category validation failed. What should I change it to? Some suggestions are AirPods, iWatch or iPhone.',
            'U: iWatch',
            TestInput.of(MultiValueControlIntent.of('AppleSuite', { AppleSuite: ['iWatch'] })),
            'A: Was that iWatch?',
            'U: Yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        ]);
    });
});
