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
import { ControlHandler, SkillInvoker } from '../src';
import { ValueControl } from '../src/commonControls/ValueControl';
import { ContainerControl, ImplicitResolutionStrategy } from '../src/controls/ContainerControl';
import { Control } from '../src/controls/Control';
import { ControlInput } from '../src/controls/ControlInput';
import { ControlManager } from '../src/controls/ControlManager';
import { ValueControlIntent } from '../src/intents/ValueControlIntent';
import { TestInput, testTurn } from '../src/utils/testSupport/TestingUtils';
import { TestStrings as $$ } from './TestStrings';

/**
 * Demonstrate container controls resolving ambiguity by asking questions.
 */
suite.only('== Ambiguity resolution (ambiguity_resolution.spec.ts) ==', () => {
    test('disambiguate between two siblings that share a target.', async () => {
        const requestHandler = new ControlHandler(new DisambiguationManager());
        const invoker = new SkillInvoker(requestHandler);

        await testTurn(
            invoker,
            'U: my name is Fred',
            TestInput.of(
                ValueControlIntent.of('CUSTOM.name', {
                    target: $$.Target.Name,
                    'CUSTOM.name': 'Fred',
                }),
            ),
            'A: Is that your first name or last name?',
        );
    });
});

class DisambiguationManager extends ControlManager {
    createControlTree(state?: any, input?: ControlInput): Control {
        const rootControl = new ContainerControl({
            id: 'root',
            dialog: {
                explicityResolveTargetAmbiguity: true,
                implicitResolutionStrategy: ImplicitResolutionStrategy.MostRecentInitiative
            },
        });

        rootControl.addChild(
            new ValueControl({
                id: $$.ID.FirstName,
                slotType: 'CUSTOM.name',
                prompts: { requestValue: 'What is your first name?' },
                interactionModel: {
                    targets: [$$.Target.Name, $$.Target.FirstName],
                },
                dialog: {
                    targetForDisambiguation: $$.Target.FirstName
                }
            }),
        );

        rootControl.addChild(
            new ValueControl({
                id: $$.ID.LastName,
                slotType: 'CUSTOM.name',
                prompts: { requestValue: 'What is your last name?' },
                interactionModel: {
                    targets: [$$.Target.Name, $$.Target.LastName],
                },
                dialog: {
                    targetForDisambiguation: $$.Target.LastName
                }
            }),
        );

        return rootControl;
    }
}
