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

import { IntentRequest } from 'ask-sdk-model';
import { suite, test } from 'mocha';
import { ControlInput, ControlResultBuilder, GeneralControlIntent } from '../../src';
import {
    MVSListControl,
    MVSListControlState,
    MVSValidationResult,
} from '../../src/commonControls/listControl/MVSListControl';
import { Strings as $, Strings } from '../../src/constants/Strings';
import { Control } from '../../src/controls/Control';
import { ControlManager } from '../../src/controls/ControlManager';
import { ValidationResult } from '../../src/controls/ValidationResult';
import { AmazonIntent } from '../../src/intents/AmazonBuiltInIntent';
import { SingleValueControlIntent } from '../../src/intents/SingleValueControlIntent';
import { ControlHandler } from '../../src/runtime/ControlHandler';
import {
    IntentBuilder,
    IntentNameToValueMapper,
    SimplifiedMVSIntent,
    SlotResolutionValue,
} from '../../src/utils/IntentUtils';
import { SkillInvoker } from '../../src/utils/testSupport/SkillInvoker';
import { testE2E, TestInput, testTurn, waitForDebugger } from '../../src/utils/testSupport/TestingUtils';

waitForDebugger();

suite('MVSListControl e2e tests', () => {
    class MVSListControlManager extends ControlManager {
        createControlTree(): Control {
            const categoryControl = new MVSListControl({
                id: 'apple',
                validation: validateProducts,
                listItemIDs: getProductList,
                slotType: 'AppleSuite',
                prompts: {
                    valueConfirmed: 'Awesome',
                },
                confirmationRequired: true,
                inputHandling: {
                    customHandlingFuncs: [
                        {
                            canHandle: isAddProductIntent,
                            handle: handleAddProductIntent,
                        },
                    ],
                },
            });

            function isAddProductIntent(input: ControlInput): boolean {
                return (
                    input.request.type === 'IntentRequest' && input.request.intent.name === 'AddProductIntent'
                );
            }

            function handleAddProductIntent(input: ControlInput, resultBuilder: ControlResultBuilder) {
                const intent = SimplifiedMVSIntent.fromIntent((input.request as IntentRequest).intent);
                /**
                 * [\{"slotValue":"iPhone","isEntityResolutionMatch":false\},\{"slotValue":"MacBook","isEntityResolutionMatch":false\}]
                 * \{"slotValue":"iPhone","isEntityResolutionMatch":false \}
                 */
                if (Array.isArray(intent.slotResolutions.product)) {
                    // MVS Intent
                    const productResolutionList = intent.slotResolutions.product;
                    const values: string[] = [];
                    const eRStatus: boolean[] = [];
                    productResolutionList.forEach((product) => {
                        values.push(product.slotValue);
                        eRStatus.push(product.isEntityResolutionMatch);
                    });
                    categoryControl.setValue(values, eRStatus);
                } else {
                    const productResolution = intent.slotResolutions.product;
                    if (productResolution !== undefined) {
                        categoryControl.setValue(
                            productResolution.slotValue,
                            productResolution.isEntityResolutionMatch,
                        );
                    }
                }
            }
            function getProductList() {
                return ['AirPods', 'iWatch', 'iPhone', 'iPad', 'MacBook'];
            }

            function validateProducts(
                state: MVSListControlState,
                input: ControlInput,
            ): true | MVSValidationResult {
                const products = state.value!;
                let result: true | MVSValidationResult = true;
                products.forEach((product) => {
                    if (getProductList().includes(product) !== true) {
                        result = {
                            renderedReason: 'Apple Suite category validation failed',
                            failedValue: product,
                        };
                    }
                });
                return result;
            }

            return categoryControl;
        }
    }

    test.only('Add multiple items', async () => {
        const requestHandler = new ControlHandler(new MVSListControlManager());
        await testE2E(requestHandler, [
            'U: add iPhone and MacBook',
            TestInput.of(
                IntentBuilder.of('AddProductIntent', {
                    product: ['iPhone', 'MacBook'],
                }),
            ),
            'A: Was that iPhone, MacBook?',
            ' u: no',
            'U: Yeah.',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Awesome',
            'U: iPac',
            TestInput.of(SingleValueControlIntent.of('AppleSuite', { AppleSuite: 'iPac' })),
            'A: Sorry, iPac is not a valid choice because Apple Suite category validation failed. What is your selection? Some suggestions are AirPods, iWatch or iPhone.',
            'U: AirPods', //replacement for iPac
            TestInput.of(SingleValueControlIntent.of('AppleSuite', { AppleSuite: 'AirPods' })),
            'A: Was that AirPods?',
            'U: Yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: ',
        ]);
    });
});

/*
  { State Tracking
    * elicitationAction
    * Invalid value
  }
 * L: 112:  'A: Sorry, iPac is not a valid choice because Apple Suite category validation failed. What do you want to replace with? Some suggestions are AirPods, iWatch or iPhone.',


 Rules: Whenever users says add iPad => explicitly add it to the controls.
    Fruit Shop market
    Xmas Card selector
    state.lastInitiative = {actName: elicitReplacement, valueId=iPod}
    value { slotValue, confirmed, valid }
 */
