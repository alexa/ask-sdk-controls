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
 * Slot values conveyed by a ValueControlIntent
 */
export interface ValueControlIntentSlots {
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
export function unpackValueControlIntent(intent: Intent): MultiValuePayload {
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
            case '__Conjunction':
                break;
            default:
                if (slotValue !== undefined) {
                    values = slotValue;
                    valueType = name;
                }
        }
    }

    if (values === undefined) {
        throw new Error(
            `ValueControlIntent did not have value slot filled.  This should have mapped to GeneralControlIntent. intent: ${JSON.stringify(
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
 *
 * ValueControlIntent is an intent that can carry multiple values for one value-type.
 *
 * - For example an utterance like "Plan a trip to go hiking, camping, and fishing"
 *  all three values 'hiking, camping, fishing' can be captured using a multiple-value slot like `activity`.
 *
 * Every sample utterance for a ValueControlIntent includes the value
 * slot.  Utterances that do not include a value slot are handled by
 * `GeneralControlIntent`.
 *
 *
 * Limitations
 *  - `AMAZON.SearchQuery` cannot be used due to restrictions in NLU. Custom
 *    intents should be defined instead.
 *
 *  - It does not support multiple value of different slottypes, see:
 *    https://developer.amazon.com/en-US/docs/alexa/custom-skills/collect-multiple-values-in-a-slot.html#about-multiple-value-slots
 *
 */
export class ValueControlIntent extends BaseControlIntent {
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
                'AMAZON.SearchQuery cannot be used with ValueControlIntent due to the special rules regarding its use. ' +
                    'Specifically, utterances that include SearchQuery must have a carrier phrase and not be comprised entirely of slot references.',
            );
        }

        this.valueSlotType = valueSlotType;
        this.filteredValueSlotType = filteredValueSlotType ?? valueSlotType;
        this.name = ValueControlIntent.intentName(valueSlotType);
    }

    /**
     * Generates the intent name of a specialized `ValueControlIntent`.
     *
     * Example:
     * - The intent name for a `ValueControlIntent` that conveys an
     *   `AMAZON.NUMBER` is `AMAZON_NUMBER_ValueControlIntent`.
     *
     * @param slotTypeId - Specific slot type id.
     */
    static intentName(slotTypeId: string) {
        return `${slotTypeId}_ValueControlIntent`.replace('.', '_');
    }

    /**
     * Create Intent from specification of the slots
     *
     */
    static of(slotType: string, slots: ValueControlIntentSlots): Intent {
        return IntentBuilder.of(ValueControlIntent.intentName(slotType), slots);
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

        if (this.filteredValueSlotType !== this.valueSlotType && this.filteredValueSlotType !== 'none') {
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
