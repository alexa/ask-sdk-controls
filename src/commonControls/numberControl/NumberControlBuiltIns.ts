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
        switch (value) {
            case 13:
                return 30;
            case 14:
                return 40;
            case 15:
                return 50;
            case 16:
                return 60;
            case 17:
                return 70;
            case 18:
                return 80;
            case 19:
                return 90;
            case 30:
                return 13;
            case 40:
                return 14;
            case 50:
                return 15;
            case 60:
                return 16;
            case 70:
                return 17;
            case 80:
                return 18;
            case 90:
                return 19;
            case 113:
                return 130;
            case 114:
                return 140;
            case 115:
                return 150;
            case 116:
                return 160;
            case 117:
                return 170;
            case 118:
                return 180;
            case 119:
                return 190;
            case 130:
                return 113;
            case 140:
                return 114;
            case 150:
                return 115;
            case 160:
                return 116;
            case 170:
                return 117;
            case 180:
                return 118;
            case 190:
                return 119;
            default:
                return undefined;
        }
    }
}
