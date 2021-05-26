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

import { MultipleLists } from '.';
import { ControlServices } from '../../../src/controls/ControlServices';
import { ControlInteractionModelGenerator } from '../../../src/interactionModelGeneration/ControlInteractionModelGenerator';

const log = ControlServices.getLogger('HelloWorld:InteractionModel');

export namespace TwoListsIM {
    export const imGen = new ControlInteractionModelGenerator()
        .buildCoreModelForControls(new MultipleLists.DemoControlManager())
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
            name: 'PetSpecies',
            values: [
                {
                    id: 'cat',
                    name: {
                        value: 'cat',
                        synonyms: ['kitty', 'house cat', 'feline'],
                    },
                },
                {
                    id: 'dog',
                    name: {
                        value: 'dog',
                        synonyms: ['doggie', 'mutt', 'puppy'],
                    },
                },
                {
                    id: 'rabbit',
                    name: {
                        value: 'rabbit',
                        synonyms: ['bunny', 'bunny rabbit'],
                    },
                },
            ],
        })

        .addOrMergeSlotType({
            name: 'PetBreed',
            values: [
                {
                    id: 'labrador',
                    name: {
                        value: 'labrador',
                        synonyms: [],
                    },
                },
                {
                    id: 'persian',
                    name: {
                        value: 'persian',
                        synonyms: [],
                    },
                },
            ],
        })

        .addOrMergeSlotType({
            name: 'TransactionType',
            values: [
                {
                    id: 'adopt',
                    name: {
                        value: 'adopt',
                        synonyms: [],
                    },
                },
                {
                    id: 'foster',
                    name: {
                        value: 'foster',
                        synonyms: [],
                    },
                },
                {
                    id: 'sponsor',
                    name: {
                        value: 'sponsor',
                        synonyms: [],
                    },
                },
            ],
        })

        .addValuesToSlotType(
            'target',
            {
                id: 'species',
                name: { value: 'species', synonyms: ['type of pet'] },
            },
            {
                id: 'petKind',
                name: { value: 'petKind' },
            },
            {
                id: 'breed',
                name: { value: 'breed' },
            },
            {
                id: 'transaction',
                name: { value: 'transaction' },
            },
        );
}

// If launched directly, build and write to a file
if (require.main === module) {
    // Build and write
    TwoListsIM.imGen.buildAndWrite('en-US-generated.json');
    log.info('Wrote ./en-US-generated.json');
}
