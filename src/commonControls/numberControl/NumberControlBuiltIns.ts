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

import i18next from 'i18next';
import { ControlInput } from '../..';
import { NumberControlState } from './NumberControl';

export namespace NumberControlBuiltIns {
    export function defaultValidationFailureText(): (value?: number) => string {
        return (value?: number) => i18next.t('NUMBER_CONTROL_DEFAULT_APL_INVALID_VALUE', { value });
    }

    export const confirmMostLikelyMisunderstandingInputs = (state: NumberControlState, input: ControlInput) =>
        defaultMostLikelyMisunderstandingFunc(state.value) !== undefined;

    export function defaultMostLikelyMisunderstandingFunc(value: number): number | undefined {
        // Static map of common ambiguous pairs among integers misinterpreted by NLU.
        const ambiguousPairs: { [key: number]: number } = {
            13: 30,
            14: 40,
            15: 50,
            16: 60,
            17: 70,
            18: 80,
            19: 90,
            30: 13,
            40: 14,
            50: 15,
            60: 16,
            70: 17,
            80: 18,
            90: 19,
            113: 130,
            114: 140,
            115: 150,
            116: 160,
            117: 170,
            118: 180,
            119: 190,
            130: 113,
            140: 114,
            150: 115,
            160: 160,
            170: 170,
            180: 118,
            190: 119,
        };
        return ambiguousPairs[value];
    }
}
