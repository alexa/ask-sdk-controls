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

const MODULE_NAME = 'QuestionnaireControlDemo:InteractionModel';
const services = ControlServices.getDefaults();
const log = services.logger.getLogger(MODULE_NAME);

export namespace TwoListsIM {
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
            name: 'YesNo',
            values: [
                {
                    id: 'yes',
                    name: {
                        value: 'yes',
                        synonyms: ['yeah', 'yep'],
                    },
                },
                {
                    id: 'no',
                    name: {
                        value: 'no',
                        synonyms: ['nope', 'not ever'],
                    },
                },
            ],
        })

        .addOrMergeSlotType({
            name: 'FrequencyAnswer',
            values: [
                {
                    id: 'often',
                    name: {
                        value: 'often',
                        synonyms: [
                            'get',
                            'have',
                            'suffer',
                            'suffer from',
                            'often', // e.g. {I} {often} {cough}
                            'often have', // e.g. {I} {often have} {headache}
                            'often get',
                            'often suffer',
                            'often suffer from',
                            'fairly often have',
                            'fairly often get',
                            'fairly often suffer',
                            'fairly often suffer from',
                            'generally have',
                            'generally get',
                            'generally suffer',
                            'generally suffer from',
                            'most of the time I have',
                            'most of the time I get',
                            'most of the time I suffer',
                            'most of the time I suffer from',
                            'frequently',
                            'frequently get',
                            'frequently have',
                            'frequently suffer',
                            'frequently suffer from',
                            'always',
                            'always get',
                            'always have',
                            'always suffer',
                            'always suffer from',
                        ],
                    },
                },
                {
                    id: 'rarely',
                    name: {
                        value: 'rarely',
                        synonyms: [
                            "don't", // e.g. {I} {don't} {cough}
                            "don't get", // e.g. {I} {don't get} {headaches}
                            "don't have",
                            "don't suffer",
                            "don't suffer from",
                            'rarely',
                            'rarely get',
                            'rarely have',
                            'rarely suffer',
                            'rarely suffer from',
                            'infrequently',
                            'infrequently get',
                            'infrequently have',
                            'infrequently suffer',
                            'infrequently suffer from',
                            'hardly ever',
                            'hardly ever get',
                            'hardly ever have',
                            'hardly ever suffer',
                            'hardly ever suffer from',
                            'never get',
                            'never have',
                            'never suffer',
                            'never suffer from',
                        ],
                    },
                },
                {
                    id: 'skip',
                    name: {
                        value: 'skip',
                        synonyms: [
                            "don't know",
                            'unsure',
                            'pass',
                            'next',
                            "I honestly don't know",
                            'maybe',
                            'off and on',
                            'from time to time',
                        ],
                    },
                },
            ],
        })

        .addOrMergeSlotType({
            name: 'target',
            values: [
                {
                    id: 'headache',
                    name: {
                        value: 'headache',
                        synonyms: [
                            'headaches',
                            'sore head',
                            'lots of headaches',
                            'bad headaches',
                            'really bad headaches',
                        ],
                    },
                },
                {
                    id: 'cough',
                    name: {
                        value: 'cough',
                        synonyms: ['coughing', 'constant coughing', 'cough a lot', 'moderate cough'],
                    },
                },
                {
                    id: 'healthQuestionnaire',
                    name: {
                        value: 'healthQuestionnaire',
                        synonyms: [
                            'the health questionnaire',
                            'health questions',
                            'symptoms',
                            'symptom questions',
                        ],
                    },
                },
            ],
        })
        .buildCoreModelForControls(new MultipleLists.DemoControlManager());
}

// If launched directly, build and write to a file
if (require.main === module) {
    // Build and write
    TwoListsIM.imGen.buildAndWrite('en-US-generated.json');
    log.info('Wrote ./en-US-generated.json');
}
