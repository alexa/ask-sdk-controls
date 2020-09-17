import { expect } from 'chai';
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
import {
    ControlHandler,
    IntentBuilder,
    SingleValueControlIntent,
    SkillInvoker,
    TestInput,
    testTurn,
    waitForDebugger,
} from '../../../../src';
import { ListDemo1 } from '../src';
import { ListDemo1IM } from '../src/buildInteractionModel';

waitForDebugger();

suite('all', async () => {
    test('YesNoMaybe List Demo - IMGen', async () => {
        const imData = ListDemo1IM.imGen.build();
        expect(imData.interactionModel?.languageModel?.intents?.find((x) => x.name === 'HelloIntent')).not
            .undefined;

        const yesNoMaybeValueControlIntent = imData.interactionModel?.languageModel?.intents?.find(
            (x) => x.name === 'YesNoMaybe_ValueControlIntent',
        );
        expect(yesNoMaybeValueControlIntent).not.undefined;
        expect(yesNoMaybeValueControlIntent?.samples?.includes('{YesNoMaybe}')).is.false;
    });

    test('YesNoMaybe List Demo - yes as value, then yes as confirmation', async () => {
        const requestHandler = new ControlHandler(new ListDemo1.DemoControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.launchRequest(),
            'A: Welcome. What is your selection? Some suggestions are yes, no or maybe.',
        );

        await testTurn(
            invoker,
            'U: yes',
            TestInput.of(IntentBuilder.of('AMAZON.YesIntent')),
            'A: Was that yes?',
        );

        await testTurn(invoker, 'U: yes', TestInput.of(IntentBuilder.of('AMAZON.YesIntent')), 'A: Great.');
    });

    test('YesNoMaybe List Demo - yes as value, no as disconfirmation, maybe as new value', async () => {
        const requestHandler = new ControlHandler(new ListDemo1.DemoControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.launchRequest(),
            'A: Welcome. What is your selection? Some suggestions are yes, no or maybe.',
        );

        await testTurn(
            invoker,
            'U: yes',
            TestInput.of(IntentBuilder.of('AMAZON.YesIntent')),
            'A: Was that yes?',
        );

        await testTurn(
            invoker,
            'U: no',
            TestInput.of(IntentBuilder.of('AMAZON.NoIntent')),
            'A: My mistake. What is your selection? Some suggestions are yes, no or maybe.',
        );

        await testTurn(
            invoker,
            'U: maybe',
            TestInput.of(SingleValueControlIntent.of('YesNoMaybe', { Maybe: 'maybe' })),
            'A: Was that maybe?',
        );

        await testTurn(invoker, 'U: yes', TestInput.of(IntentBuilder.of('AMAZON.YesIntent')), 'A: Great.');
    });
});
