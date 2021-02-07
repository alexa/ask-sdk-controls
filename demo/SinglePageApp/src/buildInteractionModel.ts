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

import { v1 } from 'ask-smapi-model';
import { SinglePageApp } from '.';
import { ControlInteractionModelGenerator } from '../../../src/interactionModelGeneration/ControlInteractionModelGenerator';
import { Logger } from '../../../src/logging/Logger';

import SlotType = v1.skill.interactionModel.SlotType;
import TypeValue = v1.skill.interactionModel.TypeValue;
import Intent = v1.skill.interactionModel.Intent;

const log = new Logger('QuestionnaireControlDemo:InteractionModel');

export namespace SinglePageAppIM {
    export const imGen = new ControlInteractionModelGenerator()
        .withInvocationName('controls demo')
        .addIntent({ name: 'AMAZON.StopIntent' })
        .addIntent({ name: 'AMAZON.NavigateHomeIntent' })
        .addIntent({ name: 'AMAZON.HelpIntent' })
        .addIntent({ name: 'AMAZON.CancelIntent' })
        .addIntent({ name: 'AMAZON.YesIntent' })
        .addIntent({ name: 'AMAZON.NoIntent' })
        .addIntent({ name: 'AMAZON.FallbackIntent' })
        .setModelConfiguration({ fallbackIntentSensitivity: { level: 'HIGH' } })

        .addOrMergeSlotType({
            name: 'target',
            values: [
                {
                    id: 'age',
                    name: {
                        value: 'age',
                        synonyms: ['my age'],
                    },
                },
                {
                    id: 'guests',
                    name: {
                        value: 'guests',
                        synonyms: ['number of guests'],
                    },
                },
            ],
        })
        .buildCoreModelForControls(new SinglePageApp.DemoControlManager());
}

// If launched directly, build and write to a file
if (require.main === module) {
    // Build and write
    SinglePageAppIM.imGen.buildAndWrite('en-US-generated.json');
    console.log('Wrote ./en-US-generated.json');
}
