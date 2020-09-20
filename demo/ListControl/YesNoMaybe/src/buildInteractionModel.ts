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
import { ListDemo1 } from '.';
import { ControlInteractionModelGenerator } from '../../../../src/interactionModelGeneration/ControlInteractionModelGenerator';
import { Logger } from '../../../../src/logging/Logger';
import { filteredYesNoMaybeSlotType, yesNoMaybeSlotType } from './interactionModelTypes';

import SlotType = v1.skill.interactionModel.SlotType;
import TypeValue = v1.skill.interactionModel.TypeValue;
import Intent = v1.skill.interactionModel.Intent;

const log = new Logger('HelloWorld:InteractionModel');

export namespace ListDemo1IM {
    export const imGen = new ControlInteractionModelGenerator()
        .buildCoreModelForControls(new ListDemo1.DemoControlManager())
        .withInvocationName('control demos')
        .addIntent({ name: 'AMAZON.StopIntent' })
        .addIntent({ name: 'AMAZON.NavigateHomeIntent' })
        .addIntent({ name: 'AMAZON.HelpIntent' })
        .addIntent({ name: 'AMAZON.CancelIntent' })
        .addIntent({ name: 'AMAZON.YesIntent' })
        .addIntent({ name: 'AMAZON.NoIntent' })
        .addIntent({ name: 'AMAZON.FallbackIntent' })

        // Add a custom intent
        .addIntent({
            name: 'HelloIntent',
            samples: ['Say hello', 'Say hi'],
        })

        .addOrMergeSlotType(yesNoMaybeSlotType)
        .addOrMergeSlotType(filteredYesNoMaybeSlotType);
}

// If launched directly, build and write to a file
if (require.main === module) {
    // Build and write
    ListDemo1IM.imGen.buildAndWrite('en-US-generated.json');
    console.log('Wrote ./en-US-generated.json');
}
