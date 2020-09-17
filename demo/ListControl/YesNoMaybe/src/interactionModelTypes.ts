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
import SlotType = v1.skill.interactionModel.SlotType;

export const yesNoMaybeSlotType: SlotType = {
    name: 'YesNoMaybe',
    values: [
        {
            id: 'yes',
            name: {
                value: 'yes',
                synonyms: ['yep', 'correct', 'affirmative', 'yup', 'yeah'],
            },
        },
        {
            id: 'no',
            name: {
                value: 'no',
                synonyms: ['no', 'nope', 'no way'],
            },
        },
        {
            id: 'maybe',
            name: {
                value: 'maybe',
                synonyms: ['maybe', 'perhaps', "I haven't decided"],
            },
        },
    ],
};

export const filteredYesNoMaybeSlotType: SlotType = {
    name: 'Maybe',
    values: [
        {
            id: 'maybe',
            name: {
                value: 'maybe',
                synonyms: ['maybe', 'perhaps', "I haven't decided"],
            },
        },
    ],
};
