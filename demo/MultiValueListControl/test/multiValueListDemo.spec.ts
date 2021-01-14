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
import { waitForDebugger, ControlHandler, SkillInvoker, testTurn, TestInput, IntentBuilder, SingleValueControlIntent, GeneralControlIntent } from '../../../src';
import { Strings as $ } from '../../../src/constants/Strings';
import { MultiValueListDemo } from '../src';
import { MultiValueListDemoIM } from '../src/buildInteractionModel';
import { MultiValueControlIntent } from '../../../src/intents/MultiValueControlIntent';
waitForDebugger();

suite('MultiValueListDemo', () => {
    test('AppleSuite MultiValueList Demo - IMGen', async () => {
        const imData = MultiValueListDemoIM.imGen.build();
        const appleSuiteMultiValueControlIntent = imData.interactionModel?.languageModel?.intents?.find(
            (x) => x.name === 'AppleSuite_MultiValueControlIntent',
        );
        expect(appleSuiteMultiValueControlIntent).not.undefined;
        expect(appleSuiteMultiValueControlIntent?.samples?.includes('{AppleSuite}')).is.true;
    });

    test('MultiValueList Demo - add multiple values', async () => {
        const requestHandler = new ControlHandler(new MultiValueListDemo.DemoControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.launchRequest(),
            'A: Welcome. What is your selection? Some suggestions are AirPods, iWatch or iPhone.',
        );

        await testTurn(
            invoker,
            'U: add iPhone and iPac',
            TestInput.of(
                MultiValueControlIntent.of('AppleSuite', {
                    AppleSuite: ['iPhone', 'iPac'],
                    action: $.Action.Add,
                }),
            ),
            'A: OK, added iPhone. Sorry, iPac can\'t be added as item is not available in the product list. Is that all?'
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
            'A: Welcome. What is your selection? Some suggestions are AirPods, iWatch or iPhone.',
        );

        await testTurn(
            invoker,
            'U: add iPhone and iPad',
            TestInput.of(
                MultiValueControlIntent.of('AppleSuite', {
                    AppleSuite: ['iPhone', 'iPad'],
                    action: $.Action.Add,
                }),
            ),
            'A: OK, added iPhone and iPad. Is that all?'
        );

        await testTurn(
            invoker,
            'U: Clear all items from cart',
            TestInput.of(GeneralControlIntent.of({ action: $.Action.Clear })),
            'A: OK, removed the following iPhone and iPad from the list. What is your selection? Some suggestions are AirPods, iWatch or iPhone.'
        );
    });
});
