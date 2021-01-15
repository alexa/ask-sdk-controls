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
import i18next from 'i18next';
import _ from 'lodash';
import { ControlManager } from '../controls/ControlManager';
import { BaseControlIntent } from '../intents/BaseControlIntent';
import { ConjunctionControlIntent } from '../intents/ConjunctionControlIntent';
import { DateRangeControlIntent } from '../intents/DateRangeControlIntent';
import { GeneralControlIntent } from '../intents/GeneralControlIntent';
import { OrdinalControlIntent } from '../intents/OrdinalControlIntent';
import { ValueControlIntent } from '../intents/ValueControlIntent';
import { Logger } from '../logging/Logger';
import { InteractionModelGenerator } from './InteractionModelGenerator';
import { IntentUtterances, ModelData } from './ModelTypes';

import Intent = v1.skill.interactionModel.Intent;
import DialogIntent = v1.skill.interactionModel.DialogIntents;
import Prompt = v1.skill.interactionModel.Prompt;
import InteractionModelData = v1.skill.interactionModel.InteractionModelData;
import SlotType = v1.skill.interactionModel.SlotType;

const log = new Logger('AskSdkControls:ControlInteractionModelGenerator');

const dummyPrompts: Prompt[] = [
    {
        id: 'Slot.Validation.564246223579.1467418044248.678461230495',
        variations: [
            {
                type: 'PlainText',
                value:
                    'This prompt is included to ensure there is a dialog model present. It is not used by skills.',
            },
        ],
    },
];

/**
 * Interaction model generator for skills that use the Controls Framework.
 *
 * This class extends `InteractionModelGenerator` with Controls-specific functionality.
 */
export class ControlInteractionModelGenerator extends InteractionModelGenerator {
    public targetSlotIds: Set<string> = new Set();

    /**
     * Adds content to the interaction model from a ControlManager.
     *
     * Behavior:
     * - Calls `controlManager.buildInteractionModel` to update the IM
     * - If any built-in controls are used, this also adds a dummy dialogModel to the
     *   interaction model to ensure that Dialog.SlotElicitation directive can be used.
     *
     * Usage:
     *  - If the built-in IM content does not include some desired locale, pass the
     *    appropriate data during instantiation of the ControlManager.
     *
     * @param controlManager - Control manager
     */
    //TODO: better name.
    buildCoreModelForControls(controlManager: ControlManager): ControlInteractionModelGenerator {
        // add all the standard slotTypes and their values
        const imData: ModelData = _generateModelData();
        this.addOrMergeSlotTypes(...imData.slotTypes);

        // add/verify the control-specific intents and ensure that all necessary
        // slotValues are present.
        controlManager.buildInteractionModel(this);
        ensureDialogModel(this, this.intents);
        return this;
    }

    // tsDoc - see InteractionModelGenerator
    build(): InteractionModelData {
        const interactionModelData: InteractionModelData = super.build();
        return interactionModelData;
    }

    /**
     * Add AMAZON.YesIntent and AMAZON.NoIntent to the interaction model.
     */
    addYesAndNoIntents(): ControlInteractionModelGenerator {
        this.addIntent({ name: 'AMAZON.YesIntent' });
        this.addIntent({ name: 'AMAZON.NoIntent' });
        return this;
    }

    /**
     * Adds the information from a ControlIntent to the interaction model.
     *
     * @param controlIntent - ControlIntent that extends `BaseControlIntent`
     * @param controlIMData - Localization data for built-ins.
     */
    addControlIntent(controlIntent: BaseControlIntent, controlIMData: ModelData): this {
        // used to record all present basic slotTypes
        const presentSlotTypesSet = new Set<string>();

        const actualIntent = generateActualIntent(controlIntent, controlIMData);
        this.addIntents(actualIntent);

        return this;
    }

    ensureSlotIsDefined(controlId: string, slotType: string) {
        // built-ins are allowed
        if (slotType.startsWith('AMAZON')) {
            return;
        }

        // otherwise slots must be explicitly defined.
        if (!this.isSlotDefined(slotType)) {
            throw new Error(
                `Control id=${controlId} requires slot type ${slotType} but it does not exist.  If it is a custom slot add it to the interaction model before calling imGen.buildCoreModelForControls()`,
            );
        }
    }

    ensureSlotIsNoneOrDefined(controlId: string, slotType: string) {
        if (slotType === 'none') {
            return;
        }
        this.ensureSlotIsDefined(controlId, slotType);
    }

    ensureSlotValueIDsAreDefined(controlId: string, slotType: string, slotValueIds: string[]) {
        for (const slotValueId of slotValueIds) {
            this.ensureSlotValueIdIsDefined(controlId, slotType, slotValueId);
        }
    }

    ensureSlotValueIdIsDefined(controlId: string, slotType: string, slotValue: string) {
        if (!this.isSlotDefined(slotType)) {
            throw new Error(`Control id=${controlId} requires slot type ${slotType} but it does not exist.`);
        }
        if (!this.isSlotValueIsDefined(slotType, slotValue)) {
            throw new Error(
                `Control ${controlId} requires slot type ${slotType} to contain value ${slotValue} but it does not exist. If it is a custom value add it to the interaction model before calling imGen.buildCoreModelForControls()`,
            );
        }
    }
}

// Convert Intent to DialogIntent
function buildDialogIntent(intent: Intent): DialogIntent {
    const dialogIntent = _.cloneDeep(intent);
    delete dialogIntent.samples;
    (dialogIntent as DialogIntent).delegationStrategy = 'SKILL_RESPONSE';

    return dialogIntent;
}

/**
 * Generate complete intent with intent samples attached
 * @param controlIntent - ControlIntent
 * @param controlIMData - Localization data
 */
function generateActualIntent(controlIntent: BaseControlIntent, controlIMData: ModelData): Intent {
    // Special logic for ValueControlIntent
    if (controlIntent.name.includes('ValueControlIntent')) {
        return handleValueControlIntent(controlIntent as ValueControlIntent, controlIMData);
    }

    const intent: Intent = controlIntent.generateIntent();
    const samples: string[] | undefined = controlIMData.intentValues.find(
        (intentValue) => intentValue.name === controlIntent.name,
    )?.samples;

    if (samples === undefined) {
        throw new Error(`${controlIntent.name} doesn't have samples registered in the ModelData.`);
    }

    intent.samples = samples;

    return intent;
}

// special handling for ValueControlIntent
function handleValueControlIntent(controlIntent: ValueControlIntent, controlIMData: ModelData): Intent {
    const intent: Intent = controlIntent.generateIntent();
    const samples: string[] | undefined = controlIMData.intentValues.find(
        (intentValue) => intentValue.name === ValueControlIntent.name,
    )?.samples;
    if (samples === undefined) {
        throw new Error('Can not find ValueControlIntent samples in ModelData');
    }
    const slotType: string = controlIntent.valueSlotType;
    const filteredSlotType: string = controlIntent.filteredValueSlotType;
    const slotTypeReplacement: string = `{${slotType}}`;
    const filteredSlotTypeReplacement: string = `{${filteredSlotType}}`;
    intent.samples = intent.samples || [];
    samples.map((sample) => {
        if (filteredSlotType === 'none' && sample.includes('[[filteredValueSlotType]]')) {
            return;
        } else {
            intent.samples!.push(
                sample
                    .replace('[[valueSlotType]]', slotTypeReplacement)
                    .replace('[[filteredValueSlotType]]', filteredSlotTypeReplacement),
            );
        }
    });
    return intent;
}

// This method adds a dummy dialogModel so that Dialog directives such as Dialog.ElicitSlotDirective can be used.
// 1. Add dummy validation rule to SimpleControlIntent' target slot
// 2. Add dummy prompt
function ensureDialogModel(generator: ControlInteractionModelGenerator, intents: Intent[]): void {
    // Since one dummy validation is enough to meet slotElicitation requirement
    // And all the builtin controls integrate with the SimpleControlIntent
    // Thus add this dummy validation to the first target type slotType
    const simpleControlIntent = intents.find((intent) => intent.name === GeneralControlIntent.name);
    if (!simpleControlIntent) {
        return;
    }
    const dialogSimpleControlIntent = buildDialogIntent(simpleControlIntent);
    generator.addDialogIntents(dialogSimpleControlIntent);

    const targetSlot = dialogSimpleControlIntent.slots?.find((slot) => slot.type === 'target');
    if (targetSlot === undefined) {
        throw new Error('target slot is not present in SimpleControlIntent');
    }
    addDummyValidationRule(targetSlot);
    generator.addPrompts(...dummyPrompts);
}

/**
 *  Add dummy dialog validation rule to the input slot.
 * @param targetSlot - Target slot
 */
function addDummyValidationRule(targetSlot: v1.skill.interactionModel.DialogSlotItems): void {
    targetSlot.elicitationRequired = false;
    targetSlot.confirmationRequired = false;
    // The particular dummy model comprises a single slot-validation that will always pass.
    targetSlot.validations = [
        {
            type: 'isNotInSet',
            prompt: 'Slot.Validation.564246223579.1467418044248.678461230495',
            values: [
                'This prompt is included to ensure there is a dialog model present. It is not used by skills.',
            ],
        },
    ];
}

/**
 * Validate the target slotIds in Controls are present in InteractionModel.
 * @param interactionModel - Interaction model
 * @param targetSlotIDs - Target slot IDs
 */
function validateTargetSlots(interactionModel: InteractionModelData, targetSlotIds: Set<string>): void {
    const presentSlotTypes: SlotType[] | undefined = interactionModel.interactionModel?.languageModel?.types;
    for (const targetSlotId of targetSlotIds) {
        if (presentSlotTypes === undefined) {
            log.warn(`target slot with id ${targetSlotId} is not present in InteractionModel.`);
            continue;
        }

        const match = presentSlotTypes.find((slotType) =>
            slotType.values?.find((value) => value.id === targetSlotId),
        );

        if (match === undefined) {
            log.warn(`target slot with id ${targetSlotId} is not present in InteractionModel.`);
        }
    }
}

/**
 * Produces a lookup table of localized slot and intent definitions used when adding
 * built-ins to the interaction model.
 *
 * Usage:
 * - initiative i18next before calling this function.
 */
// Exported for internal-use only.
// TODO: review this convention: use _ prefix for functions that are for internal use only
export function _generateModelData(): ModelData {
    const slotTypes: SlotType[] = [];
    slotTypes.push(i18next.t('SHARED_SLOT_TYPES_FEEDBACK', { returnObjects: true }));
    slotTypes.push(i18next.t('SHARED_SLOT_TYPES_FILTERED_FEEDBACK', { returnObjects: true }));
    slotTypes.push(i18next.t('SHARED_SLOT_TYPES_HEAD', { returnObjects: true }));
    slotTypes.push(i18next.t('SHARED_SLOT_TYPES_TAIL', { returnObjects: true }));
    slotTypes.push(i18next.t('SHARED_SLOT_TYPES_CONJUNCTION', { returnObjects: true }));
    slotTypes.push(i18next.t('SHARED_SLOT_TYPES_PREPOSITION', { returnObjects: true }));
    slotTypes.push(i18next.t('SHARED_SLOT_TYPES_ACTION', { returnObjects: true }));
    slotTypes.push(i18next.t('SHARED_SLOT_TYPES_TARGET', { returnObjects: true }));

    const intentValues: IntentUtterances[] = [];
    intentValues.push({
        name: ConjunctionControlIntent.name,
        samples: i18next.t('CONJUNCTION_CONTROL_INTENT_SAMPLES', { returnObjects: true }),
    });
    intentValues.push({
        name: DateRangeControlIntent.name,
        samples: i18next.t('DATE_RANGE_CONTROL_INTENT_SAMPLES', { returnObjects: true }),
    });
    intentValues.push({
        name: GeneralControlIntent.name,
        samples: i18next.t('GENERAL_CONTROL_INTENT_SAMPLES', { returnObjects: true }),
    });
    intentValues.push({
        name: OrdinalControlIntent.name,
        samples: i18next.t('ORDINAL_CONTROL_INTENT_SAMPLES', { returnObjects: true }),
    });
    intentValues.push({
        name: ValueControlIntent.name,
        samples: i18next.t('VALUE_CONTROL_INTENT_SAMPLES', { returnObjects: true }),
    });

    return {
        slotTypes,
        intentValues,
    };
}
