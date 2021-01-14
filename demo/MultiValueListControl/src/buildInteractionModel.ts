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

import { MultiValueListDemo } from '.';
import { Logger, ControlInteractionModelGenerator } from '../../../src';
import { yesNoMaybeSlotType, filteredYesNoMaybeSlotType } from '../../ListControl/YesNoMaybe/src/interactionModelTypes';

const log = new Logger('MultiValueListDemo:InteractionModel');

export namespace MultiValueListDemoIM {
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
        .addOrMergeSlotType(yesNoMaybeSlotType)
        .addOrMergeSlotType(filteredYesNoMaybeSlotType)
        .addOrMergeSlotType({
            name: 'AppleSuite',
            values: [
                {
                    id: 'AirPods',
                    name: {
                        value: 'AirPods',
                        synonyms: ['pods', 'earphones', 'ipod'],
                    },
                },
                {
                    id: 'iWatch',
                    name: {
                        value: 'iWatch',
                        synonyms: ['watch', 'wrist wear'],
                    },
                },
                {
                    id: 'iPhone',
                    name: {
                        value: 'iPhone',
                        synonyms: ['phone', 'mobile'],
                    },
                },
                {
                    id: 'iPad',
                    name: {
                        value: 'iPad',
                        synonyms: ['tab'],
                    },
                },
                {
                    id: 'MacBook',
                    name: {
                        value: 'MacBook',
                        synonyms: ['laptop'],
                    },
                },
            ],
        })
        .buildCoreModelForControls(new MultiValueListDemo.DemoControlManager());
}

// If launched directly, build and write to a file
if (require.main === module) {
    // Build and write
    MultiValueListDemoIM.imGen.buildAndWrite('en-US-generated.json');
    console.log('Wrote ./en-US-generated.json');
}
