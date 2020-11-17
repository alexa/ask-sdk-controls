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

import { Intent } from 'ask-sdk-model';
import { v1 } from 'ask-smapi-model';
import { SharedSlotType } from '../interactionModelGeneration/ModelTypes';
import { getMVSSlotResolutions, IntentBuilder, SlotResolutionValue } from '../utils/IntentUtils';
import { BaseControlIntent } from './BaseControlIntent';

/**
 * Slot values conveyed by a MultiValueControlIntent
 */
export interface MultiValueControlIntentSlots {
    feedback?: string;
    action?: string;
    target?: string;
    [key: string]: string[] | string | undefined;
}

export interface MultiValueSlot {
    [key: string]: string | boolean;
}

export interface MultiValuePayload {
    feedback?: string;
    action?: string;
    target?: string;
    values: Array<{
        slotValue: string;
        isEntityResolutionMatch: boolean;
    }>;
    valueType?: string;
}

/**
 * Unpacks the complete intent object into a simpler representation.
 *
 * Note re "empty slots":
 * - Slots in the intent with no value appear in the intent object as "".
 *   However, these are unpacked as **`undefined`** to be more explicit and ease
 *   the implementation of predicates.
 * @param intent - Intent
 */
export function unpackMultiValueControlIntent(intent: Intent): MultiValuePayload {
    if (!intent.name.endsWith('ControlIntent')) {
        throw new Error(`Not a ControlIntent: ${intent.name}`);
    }

    let action: string | undefined;
    let feedback: string | undefined;
    let target: string | undefined;
    let values:
        | Array<{
              slotValue: string;
              isEntityResolutionMatch: boolean;
          }>
        | undefined;
    let valueType: string | undefined;

    for (const [name, slot] of Object.entries(intent.slots!)) {
        const slotObject = getMVSSlotResolutions(slot);
        let slotValue: SlotResolutionValue[] | undefined;

        if (slotObject !== undefined) {
            slotValue = Array.isArray(slotObject) ? slotObject : [slotObject];
        }

        switch (name) {
            case 'action':
                action = slotValue !== undefined ? slotValue[0].slotValue : undefined;
                break;
            case 'feedback':
                feedback = slotValue !== undefined ? slotValue[0].slotValue : undefined;
                break;
            case 'target':
                target = slotValue !== undefined ? slotValue[0].slotValue : undefined;
                break;
            case 'head':
                break;
            case 'tail':
                break;
            case 'preposition':
                break;
            default:
                if (slotValue !== undefined) {
                    // did we already capture a value?
                    // if (valueType !== undefined) {
                    //     throw new Error('a MultiValueControlIntent should only have one value slot');
                    // }
                    // treat it as a slot whose name is an NLU slot type.
                    values = slotValue;
                    valueType = name;
                }
        }
    }

    if (values === undefined) {
        throw new Error(
            `MultiValueControlIntent did not have value slot filled.  This should have mapped to GeneralControlIntent. intent: ${JSON.stringify(
                intent,
            )}`,
        );
    }

    return {
        feedback,
        action,
        target,
        values,
        valueType,
    };
}

/**
 * TODO docs
 * Intent that conveys feedback, action, target and an AMAZON.Ordinal value
 *
 * The value slot will be named according to the Slot type.
 * - For example `{'AMAZON.NUMBER': '2'}` or  `{ 'AMAZON.Ordinal': 'first' }`
 *
 * Every sample utterance for a MultiValueControlIntent includes the value
 * slot.  Utterances that do not include a value slot are handled by
 * `GeneralControlIntent`.
 *
 * Limitations
 *  - `AMAZON.SearchQuery` cannot be used due to restrictions in NLU. Custom
 *    intents should be defined instead.
 */
export class MultiValueControlIntent extends BaseControlIntent {
    valueSlotType: string;
    filteredValueSlotType: string;

    /**
     * Constructor.
     *
     * @param valueSlotType - SlotType that defines all legal values.
     * @param filteredValueSlotType - SlotType that defines legal values except those
     * that conflict with other intents. Defaults to `valueSlotType`.
     */
    constructor(valueSlotType: string, filteredValueSlotType?: string) {
        super();

        if (valueSlotType === 'AMAZON.SearchQuery') {
            throw new Error(
                'AMAZON.SearchQuery cannot be used with MultiValueControlIntent due to the special rules regarding its use. ' +
                    'Specifically, utterances that include SearchQuery must have a carrier phrase and not be comprised entirely of slot references.',
            );
        }

        this.valueSlotType = valueSlotType;
        this.filteredValueSlotType = filteredValueSlotType ?? valueSlotType;
        this.name = MultiValueControlIntent.intentName(valueSlotType);
    }

    /**
     * Generates the intent name of a specialized `MultiValueControlIntent`.
     *
     * Example:
     * - The intent name for a `MultiValueControlIntent` that conveys an
     *   `AMAZON.NUMBER` is `AMAZON_NUMBER_MultiValueControlIntent`.
     *
     * @param slotTypeId - Specific slot type id.
     */
    static intentName(slotTypeId: string) {
        return `${slotTypeId}_MultiValueControlIntent`.replace('.', '_');
    }

    /**
     * Create Intent from specification of the slots
     *
     * Usage:
     *  * the value should be provided as a property with name = <SlotType>
     *
     * Examples:
     * - AMAZON.NUMBER:
     * ```
     * {
     *    name: AMAZON_NUMBER_ValueControlIntent
     *    slots: { target: 'count', 'AMAZON.NUMBER': '2' }
     *    confirmationStatus: 'NONE'
     * }
     * ```
     * - AMAZON.Ordinal:
     * ```
     * {
     *    name: AMAZON_ORDINAL_ValueControlIntent
     *    slots: { action: 'set', 'AMAZON.Ordinal': 'first'}
     *    confirmationStatus: 'NONE'
     * }
     * ```
     */
    static of(slotType: string, slots: MultiValueControlIntentSlots): Intent {
        return IntentBuilder.of(MultiValueControlIntent.intentName(slotType), slots);
    }

    // tsDoc: see BaseControlIntent
    generateIntent(): v1.skill.interactionModel.Intent {
        return {
            name: this.name,
            slots: this.generateSlots(),
            samples: [],
        };
    }

    private generateSlots(): v1.skill.interactionModel.SlotDefinition[] {
        const slots: v1.skill.interactionModel.SlotDefinition[] = [
            {
                name: 'feedback',
                type: SharedSlotType.FEEDBACK,
            },
            {
                name: 'action',
                type: SharedSlotType.ACTION,
            },
            {
                name: 'target',
                type: SharedSlotType.TARGET,
            },
            {
                name: 'preposition',
                type: SharedSlotType.PREPOSITION,
            },
            {
                name: 'head',
                type: SharedSlotType.HEAD,
            },
            {
                name: 'tail',
                type: SharedSlotType.TAIL,
            },
            {
                name: `${this.valueSlotType}`,
                type: `${this.valueSlotType}`,
                multipleValues: {
                    enabled: true,
                },
            },
        ];

        if (this.filteredValueSlotType !== this.valueSlotType) {
            slots.push({
                name: `${this.filteredValueSlotType}`,
                type: `${this.filteredValueSlotType}`,
                multipleValues: {
                    enabled: true,
                },
            });
        }

        return slots;
    }
}
