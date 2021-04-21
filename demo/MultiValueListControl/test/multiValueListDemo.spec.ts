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
import {
    ControlHandler,
    GeneralControlIntent,
    IntentBuilder,
    SkillInvoker,
    TestInput,
    testTurn,
    waitForDebugger,
} from '../../../src';
import { Strings as $ } from '../../../src/constants/Strings';
import { ValueControlIntent } from '../../../src/intents/ValueControlIntent';
import { MultiValueListDemo } from '../src';
import { MultiValueListDemoIM } from '../src/buildInteractionModel';
waitForDebugger();

suite('MultiValueList Demo', () => {
    test('GroceryItem MultiValueList Demo - IMGen', async () => {
        const imData = MultiValueListDemoIM.imGen.build();
        const groceryItemValueControlIntent = imData.interactionModel?.languageModel?.intents?.find(
            (x) => x.name === 'GroceryItem_ValueControlIntent',
        );
        expect(groceryItemValueControlIntent).not.undefined;
        expect(groceryItemValueControlIntent?.samples?.includes('{GroceryItem}')).is.true;
    });

    test('MultiValueList Demo - add multiple values', async () => {
        const requestHandler = new ControlHandler(new MultiValueListDemo.DemoControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.launchRequest(),
            'A: Welcome. What is your selection? Some suggestions are Milk, Eggs or Cereal.',
        );

        await testTurn(
            invoker,
            'U: add Milk and Honey',
            TestInput.of(
                ValueControlIntent.of('GroceryItem', {
                    GroceryItem: ['Milk', 'Honey'],
                    action: $.Action.Add,
                }),
            ),
            "A: OK, added Milk. Sorry, Honey can't be added as item is not available in the shopping list. Is that all?",
        );

        await testTurn(invoker, 'U: yes', TestInput.of(IntentBuilder.of('AMAZON.YesIntent')), 'A: Great.');
    });

    test('MultiValueList Demo - add multiple values, remove all', async () => {
        const requestHandler = new ControlHandler(new MultiValueListDemo.DemoControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.launchRequest(),
            'A: Welcome. What is your selection? Some suggestions are Milk, Eggs or Cereal.',
        );

        await testTurn(
            invoker,
            'U: add Bread, Eggs and Milk',
            TestInput.of(
                ValueControlIntent.of('GroceryItem', {
                    GroceryItem: ['Bread', 'Eggs', 'Milk'],
                    action: $.Action.Add,
                }),
            ),
            'A: OK, added Bread, Eggs and Milk. Is that all?',
        );

        await testTurn(
            invoker,
            'U: Clear all items',
            TestInput.of(GeneralControlIntent.of({ action: $.Action.Clear })),
            'A: OK, cleared Bread, Eggs and Milk from the list. What is your selection? Some suggestions are Milk, Eggs or Cereal.',
        );
    });
});
