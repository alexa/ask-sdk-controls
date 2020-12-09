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
    SingleValueControlIntent,
    SkillInvoker,
    TestInput,
    testTurn,
    waitForDebugger,
} from '../../../src';
import { MultipleLists } from '../src';

waitForDebugger();

suite('all', () => {
    test('YesNoMaybe List Demo - yes as value, then yes as confirmation', async () => {
        const requestHandler = new ControlHandler(new MultipleLists.DemoControlManager());
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.launchRequest(),
            'A: Welcome. What is your selection? Some suggestions are cat, dog or rabbit.',
        );

        await testTurn(
            invoker,
            'U: cat',
            TestInput.of(SingleValueControlIntent.of('PetSpecies', { PetSpecies: 'cat' })),
            'A: OK, cat. What is your selection? Some suggestions are labrador or persian.',
        );

        await testTurn(
            invoker,
            'U: persian',
            TestInput.of(SingleValueControlIntent.of('PetBreed', { PetBreed: 'persian' })),
            'A: OK, persian. What is your selection? Some suggestions are adopt, foster or sponsor.',
        );
    });
});
