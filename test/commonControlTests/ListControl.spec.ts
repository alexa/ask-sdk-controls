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
import { GeneralControlIntent } from '../../src';
import { ListControl } from '../../src/commonControls/listControl/ListControl';
import { Strings as $, Strings } from '../../src/constants/Strings';
import { Control } from '../../src/controls/Control';
import { ControlManager } from '../../src/controls/ControlManager';
import { AmazonIntent } from '../../src/intents/AmazonBuiltInIntent';
import { ValueControlIntent } from '../../src/intents/ValueControlIntent';
import { ControlHandler } from '../../src/runtime/ControlHandler';
import { IntentBuilder, defaultIntentToValueMapper } from '../../src/utils/IntentUtils';
import { SkillInvoker } from '../../src/utils/testSupport/SkillInvoker';
import { testE2E, TestInput, testTurn, waitForDebugger } from '../../src/utils/testSupport/TestingUtils';

waitForDebugger();

suite('ListControl e2e tests', () => {
    class ListControlManager extends ControlManager {
        createControlTree(): Control {
            return new ListControl({
                id: 'apple',
                validation: (state, input) =>
                    ['iPhone', 'iPad', 'MacBook'].includes(state.value!)
                        ? true
                        : { renderedReason: 'Apple Suite category validation failed' },
                listItemIDs: ['iPhone', 'iPad', 'MacBook'],
                slotType: 'AppleSuite',
                confirmationRequired: true,
                prompts: {
                    valueSet: '',
                },
            });
        }
    }

    test('product value valid, needs explicit affirming', async () => {
        const requestHandler = new ControlHandler(new ListControlManager());
        await testE2E(requestHandler, [
            'U: iPhone',
            TestInput.of(ValueControlIntent.of('AppleSuite', { AppleSuite: 'iPhone' })),
            'A: Was that iPhone?',
            'U: Yeah.',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        ]);
    });

    test('product value after disaffirmation, requires request value act', async () => {
        const requestHandler = new ControlHandler(new ListControlManager());
        await testE2E(requestHandler, [
            'U: iPhone',
            TestInput.of(ValueControlIntent.of('AppleSuite', { AppleSuite: 'iPhone' })),
            'A: Was that iPhone?',
            'U: No.',
            TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
            'A: My mistake. What is your selection? Some suggestions are iPhone, iPad or MacBook.',
        ]);
    });

    test('product value set and changing it requires confirmation and value changed act', async () => {
        const requestHandler = new ControlHandler(new ListControlManager());
        await testE2E(requestHandler, [
            'U: iPhone',
            TestInput.of(ValueControlIntent.of('AppleSuite', { AppleSuite: 'iPhone' })),
            'A: Was that iPhone?',
            'U: Yes.',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
            'U: Change to iPad.',
            TestInput.of(
                ValueControlIntent.of('AppleSuite', { AppleSuite: 'iPad', action: $.Action.Change }),
            ),
            'A: OK, I changed it to iPad. Was that iPad?',
            'U: Yes.',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        ]);
    });

    test('product value set and changing it to invalid requires confirmation and checks for validations', async () => {
        const requestHandler = new ControlHandler(new ListControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: iPhone',
            TestInput.of(ValueControlIntent.of('AppleSuite', { AppleSuite: 'iPhone' })),
            'A: Was that iPhone?',
        );

        await testTurn(
            invoker,
            'U: Yes.',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        );

        await testTurn(
            invoker,
            'U: Change to Airpods.',
            TestInput.of(
                ValueControlIntent.of('AppleSuite', { AppleSuite: 'Airpods', action: $.Action.Change }),
            ),
            'A: Sorry, Airpods is not a valid choice because Apple Suite category validation failed. What should I change it to? Some suggestions are iPhone, iPad or MacBook.',
        );

        await testTurn(
            invoker,
            'U: iPad',
            TestInput.of(ValueControlIntent.of('AppleSuite', { AppleSuite: 'iPad' })),
            'A: OK, I changed it to iPad. Was that iPad?',
        );

        await testTurn(
            invoker,
            'U: No.',
            TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
            'A: My mistake. What is your selection? Some suggestions are iPhone, iPad or MacBook.',
        );

        await testTurn(
            invoker,
            'U: iPad',
            TestInput.of(ValueControlIntent.of('AppleSuite', { AppleSuite: 'iPad' })),
            'A: OK, I changed it to iPad. Was that iPad?',
        );

        await testTurn(
            invoker,
            'U: Yes.',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        );
    });

    test('Select by touch', async () => {
        const requestHandler = new ControlHandler(new ListControlManager());
        const invoker = new SkillInvoker(requestHandler);

        await testTurn(
            invoker,
            'U: <touches "MacBook">',
            TestInput.simpleUserEvent(['apple', 3]),
            'A: ', // No voice prompt for touch
        );

        expect(requestHandler.getSerializableControlStates().apple.value).equals('MacBook');
        expect(requestHandler.getSerializableControlStates().apple.erMatch).equals(true);
    });

    //--

    class YesNoMaybeControlManager extends ControlManager {
        createControlTree(): Control {
            return new ListControl({
                id: 'question',
                listItemIDs: ['yes', 'no', 'maybe'],
                slotType: 'YesNoMaybe',
                confirmationRequired: true,
                interactionModel: {
                    slotValueConflictExtensions: {
                        filteredSlotType: 'Maybe',
                        intentToValueMapper: (intent) => defaultIntentToValueMapper(intent), //TODO: make this the default on ListControl.
                    },
                },
                prompts: {
                    valueSet: '',
                },
            });
        }
    }

    test('ListControl for yes|no|maybe ', async () => {
        const requestHandler = new ControlHandler(new YesNoMaybeControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.of(GeneralControlIntent.of({ action: Strings.Action.Set })),
            'A: What is your selection? Some suggestions are yes, no or maybe.',
        );

        await testTurn(
            invoker,
            'U: yes',
            TestInput.of(IntentBuilder.of('AMAZON.YesIntent')),
            'A: Was that yes?',
        );

        await testTurn(invoker, 'U: yes', TestInput.of(IntentBuilder.of('AMAZON.YesIntent')), 'A: Great.');
    });
});
