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
    IntentBuilder,
    SingleValueControlIntent,
    SkillInvoker,
    TestInput,
    testTurn,
    waitForDebugger,
    AmazonBuiltInSlotType,
    AmazonIntent
} from '../../../../src';
import { BasicNumberDemo } from '../src';
import { BasicNumberDemoIM } from '../src/buildInteractionModel';

waitForDebugger();

suite('all', () => {
    test('Number Demo - IMGen', async () => {
        const imData = BasicNumberDemoIM.imGen.build();

        const numberValueControlIntent = imData.interactionModel?.languageModel?.intents?.find(
            (x) => x.name === 'AMAZON_NUMBER_ValueControlIntent',
        );
        expect(numberValueControlIntent).not.undefined;
    });

    test('Number Demo - give value, then confirm', async () => {
        const requestHandler = new ControlHandler(new BasicNumberDemo.DemoControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.launchRequest(),
            'A: Welcome. What number?',
        );

        await testTurn(
            invoker,
            'U: four',
            TestInput.of(SingleValueControlIntent.of('AMAZON.NUMBER', { 'AMAZON.NUMBER': '4' })),
            'A: Was that 4?',
        );

        await testTurn(invoker, 'U: yes', TestInput.of(IntentBuilder.of('AMAZON.YesIntent')), 'A: Great.');
    });

    test('Number Demo - 40 as value, no as disconfirmation, resolve ambiguity to 14', async () => {
        const requestHandler = new ControlHandler(new BasicNumberDemo.DemoControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.launchRequest(),
            'A: Welcome. What number?',
        );

        await testTurn(
            invoker,
            'U: forty',
            TestInput.of(SingleValueControlIntent.of('AMAZON.NUMBER', { 'AMAZON.NUMBER': '40' })),
            'A: Was that 40?',
        );

        await testTurn(
            invoker,
            'U: no',
            TestInput.of(IntentBuilder.of('AMAZON.NoIntent')),
            'A: My mistake. Did you perhaps mean 14?',
        );

        await testTurn(invoker, 'U: yes', TestInput.of(IntentBuilder.of('AMAZON.YesIntent')), 'A: Great.');
    });

    test('Number Demo - screen input, no confirmation', async () => {
        const requestHandler = new ControlHandler(new BasicNumberDemo.DemoControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.launchRequest(),
            'A: Welcome. What number?',
        );

        await testTurn(
            invoker,
            'U: __',
            TestInput.simpleUserEvent(['number', 40]),
            'A: Ok. Value set to 40.',
        );
    });

    test('Number Demo - screen input, invalid, new value valid', async () => {
        const requestHandler = new ControlHandler(new BasicNumberDemo.DemoControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.launchRequest(),
            'A: Welcome. What number?',
        );

        await testTurn(
            invoker,
            'U: __',
            TestInput.simpleUserEvent(['number', 3]),
            'A: Sorry but that\'s not a valid choice because the value must be even. What number?',
        );

        await testTurn(
            invoker,
            'U: 4',
            TestInput.of(
                SingleValueControlIntent.of(AmazonBuiltInSlotType.NUMBER, { 'AMAZON.NUMBER': '4' }),
            ),
            'A: Was that 4?',
        );

        await testTurn(
            invoker,
            'U: Yes',
            TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
            'A: Great.',
        );
    });
});
