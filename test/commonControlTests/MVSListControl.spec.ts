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
import { GeneralControlIntent } from '../../src/intents/GeneralControlIntent';
import { MultiValueControlIntent } from '../../src/intents/MultiValueControlIntent';
import { ControlHandler } from '../../src/runtime/ControlHandler';
import { IntentBuilder } from '../../src/utils/IntentUtils';
import { testE2E, TestInput, waitForDebugger } from '../../src/utils/testSupport/TestingUtils';

waitForDebugger();

suite('MVSListControl e2e tests', () => {
    class CategorySuiteManager extends ControlManager {
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

    function contactSelectorControl(confirmationRequired: boolean = false): MVSListControl {
        return new MVSListControl({
            id: 'contact',
            validation: validateContacts,
            listItemIDs: getContacts,
            slotType: 'ContactSelector',
            interactionModel: {
                actions: {
                    change: [$.Action.Change, 'replace'],
                    add: [$.Action.Select, $.Action.Add, 'send'],
                },
            },
            prompts: {
                confirmValue: (act) => {
                    return `Do you want to add ${act.payload.renderedValue}?`;
                },
            },
            confirmationRequired,
        });
    }
    function getContacts() {
        return ['Maya', 'Mary', 'Dave', 'Joe'];
    }

    function validateContacts(state: MVSListControlState): true | MVSValidationResult {
        for (const contact of state.value!) {
            if (getContacts().includes(contact.id) !== true) {
                return {
                    renderedReason: 'Input name is not part of your contact list',
                    invalidValue: contact.id,
                };
            }
        }
        return true;
    }

    class ContactSelectorManager extends ControlManager {
        createControlTree(): Control {
            return contactSelectorControl();
        }
    }

    class ConfirmationContactSelectorManager extends ControlManager {
        createControlTree(): Control {
            return contactSelectorControl(true);
        }
    }

    suite('CategorySuiteManager e2e tests', () => {
        test('Add multiple items with an invalid value', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
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
            const requestHandler = new ControlHandler(new CategorySuiteManager());
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
                    MultiValueControlIntent.of('AppleSuite', { AppleSuite: 'iPac', action: $.Action.Add }),
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
            const requestHandler = new ControlHandler(new CategorySuiteManager());
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
                TestInput.of(MultiValueControlIntent.of('AppleSuite', { AppleSuite: 'AirPods' })),
                'A: Was that AirPods?',
                'U: Yes',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great.',
            ]);
        });

        test('Add multiple items and provide replacements', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
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
                        AppleSuite: 'iPod',
                        action: $.Action.Add,
                    }),
                ),
                'A: Was that iPhone, iPac and iPod?',
                'U: Yes',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great. Sorry, iPac is not a valid choice because Apple Suite category validation failed. What should I change it to? Some suggestions are AirPods, iWatch or iPhone.',
                'U: AirPods', //replacement for iPac
                TestInput.of(MultiValueControlIntent.of('AppleSuite', { AppleSuite: 'AirPods' })),
                'A: Was that AirPods?',
                'U: Yes',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great. Sorry, iPod is not a valid choice because Apple Suite category validation failed. What should I change it to? Some suggestions are AirPods, iWatch or iPhone.',
                'U: iWatch',
                TestInput.of(MultiValueControlIntent.of('AppleSuite', { AppleSuite: 'iWatch' })),
                'A: Was that iWatch?',
                'U: Yes',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great.',
            ]);
        });
    });

    suite('ContactSelectorManager e2e tests', () => {
        test('add multiple contacts to send card', async () => {
            const requestHandler = new ControlHandler(new ContactSelectorManager());
            await testE2E(requestHandler, [
                'U: send to Mary and Maya ',
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: ['Mary', 'Maya'],
                        action: 'send',
                    }),
                ),
                'A: OK, added Mary and Maya.',
            ]);
        });

        test('add multiple invalid contacts to send card', async () => {
            const requestHandler = new ControlHandler(new ContactSelectorManager());
            await testE2E(requestHandler, [
                'U: send to Amazon and Jake ',
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: ['Amazon', 'Jake'],
                        action: 'send',
                    }),
                ),
                'A: OK, added Amazon and Jake. Sorry, Amazon is not a valid choice because Input name is not part of your contact list. What should I change it to? Some suggestions are Maya, Mary or Dave.',
                'U: replace to Maya',
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: 'Maya',
                        action: 'replace',
                    }),
                ),
                'A: OK, I changed it to Jake and Maya. Sorry, Jake is not a valid choice because Input name is not part of your contact list. What should I change it to? Some suggestions are Maya, Mary or Dave.',
                'U: change to Mary and Dave',
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: ['Mary', 'Dave'],
                        action: $.Action.Change,
                    }),
                ),
                'A: OK, I changed it to Maya, Mary and Dave.',
            ]);
        });

        test('add multiple contacts with negative confirmation', async () => {
            const requestHandler = new ControlHandler(new ConfirmationContactSelectorManager());
            await testE2E(requestHandler, [
                'U: send it to Amazon and Jake ',
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: ['Amazon', 'Jake'],
                        action: 'send',
                    }),
                ),
                'A: Do you want to add Amazon and Jake?',
                'U: Nope',
                TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
                'A: Do you want to add Amazon?',
                'U: No Mary and Joe', // no with values are assumed to delete Invalid/Confirm Act values and replace them
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: ['Mary', 'Joe'],
                        feedback: $.Feedback.Disaffirm,
                    }),
                ),
                'A: Do you want to add Jake, Mary and Joe?',
                'U: Nah',
                TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
                'A: Do you want to add Jake?',
                'U: Nope',
                TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
                'A: Do you want to add Mary?',
                'U: Yeah',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great. Do you want to add Joe?',
                'U: Yes',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great.',
            ]);
        });

        test('remove items from list and set to new values', async () => {
            const requestHandler = new ControlHandler(new ContactSelectorManager());
            await testE2E(requestHandler, [
                'U: send to Mary and Maya ',
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: ['Mary', 'Maya'],
                        action: 'send',
                    }),
                ),
                'A: OK, added Mary and Maya.',
                'U: remove Maya',
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: 'Maya',
                        action: $.Action.Remove,
                    }),
                ),
                'A: OK, removed Maya.',
                'U: remove Maya',
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: 'Maya',
                        action: $.Action.Remove,
                    }),
                ),
                'A: Sorry, Maya is not a valid choice because The value does not exist on state. What value do you want to remove? Some suggestions are Mary.',
                'U: remove Mary',
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: 'Mary',
                        action: $.Action.Remove,
                    }),
                ),
                'A: OK, removed Mary.',
                'U: set it to Joe and Dave',
                TestInput.of(
                    MultiValueControlIntent.of('ContactSelector', {
                        ContactSelector: ['Joe', 'Dave'],
                        action: $.Action.Set,
                    }),
                ),
                'A: OK, Joe and Dave.',
                'U: clear it',
                TestInput.of(GeneralControlIntent.of({ action: $.Action.Clear })),
                'A: OK, removed all Joe and Dave. What is your selection? Some suggestions are Maya, Mary or Dave.',
            ]);
        });
    });
});
