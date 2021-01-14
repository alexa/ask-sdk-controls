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
import { suite, test } from 'mocha';
import { expect } from 'chai';
import {
    waitForDebugger,
    ControlHandler,
    SkillInvoker,
    testTurn,
    TestInput,
    IntentBuilder,
    SingleValueControlIntent,
    GeneralControlIntent,
} from '../../../src';
import { Strings as $ } from '../../../src/constants/Strings';
import { MultiValueListDemo } from '../src';
import { MultiValueListDemoIM } from '../src/buildInteractionModel';
import { MultiValueControlIntent } from '../../../src/intents/MultiValueControlIntent';
waitForDebugger();

suite('MultiValueList Demo', () => {
    test('GroceryItem MultiValueList Demo - IMGen', async () => {
        const imData = MultiValueListDemoIM.imGen.build();
        const groceryItemMultiValueControlIntent = imData.interactionModel?.languageModel?.intents?.find(
            (x) => x.name === 'GroceryItem_MultiValueControlIntent',
        );
        expect(groceryItemMultiValueControlIntent).not.undefined;
        expect(groceryItemMultiValueControlIntent?.samples?.includes('{GroceryItem}')).is.true;
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
                MultiValueControlIntent.of('GroceryItem', {
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
                MultiValueControlIntent.of('GroceryItem', {
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
            'A: OK, removed Bread, Eggs and Milk from the list. What is your selection? Some suggestions are Milk, Eggs or Cereal.',
        );
    });
});
