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
import { ControlInteractionModelGenerator } from '../../../src';
import { ControlServices } from '../../../src/controls/ControlServices';
import {
    filteredYesNoMaybeSlotType,
    yesNoMaybeSlotType,
} from '../../ListControl/YesNoMaybe/src/interactionModelTypes';

const log = ControlServices.getLogger('MultiValueListDemo:InteractionModel');

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
            name: 'GroceryItem',
            values: [
                {
                    id: 'Milk',
                    name: {
                        value: 'Milk',
                        synonyms: ['milk', 'almond milk', 'low fat milk'],
                    },
                },
                {
                    id: 'Eggs',
                    name: {
                        value: 'Eggs',
                        synonyms: ['egg', 'eggs'],
                    },
                },
                {
                    id: 'Cereal',
                    name: {
                        value: 'Cereal',
                        synonyms: ['cereal', 'oats', 'breakfast food'],
                    },
                },
                {
                    id: 'Bread',
                    name: {
                        value: 'Bread',
                        synonyms: ['bread'],
                    },
                },
                {
                    id: 'Honey',
                    name: {
                        value: 'Honey',
                        synonyms: ['honey', 'nectar'],
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
    log.info('Wrote ./en-US-generated.json');
}
