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

import { BasicNumberDemo } from '.';
import { ControlServices } from '../../../../src/controls/ControlServices';
import { ControlInteractionModelGenerator } from '../../../../src/interactionModelGeneration/ControlInteractionModelGenerator';

const MODULE_NAME = 'NumberControlDemo:InteractionModel';
const services = ControlServices.getDefaults();
const log = services.logger.getLogger(MODULE_NAME);

export namespace BasicNumberDemoIM {
    export const imGen = new ControlInteractionModelGenerator()
        .withInvocationName('control demos')
        .addIntent({ name: 'AMAZON.StopIntent' })
        .addIntent({ name: 'AMAZON.NavigateHomeIntent' })
        .addIntent({ name: 'AMAZON.HelpIntent' })
        .addIntent({ name: 'AMAZON.CancelIntent' })
        .addIntent({ name: 'AMAZON.YesIntent' })
        .addIntent({ name: 'AMAZON.NoIntent' })
        .addIntent({ name: 'AMAZON.FallbackIntent' })
        .setModelConfiguration({ fallbackIntentSensitivity: { level: 'HIGH' } })
        .buildCoreModelForControls(new BasicNumberDemo.DemoControlManager());
}

// If launched directly, build and write to a file
if (require.main === module) {
    // Build and write
    BasicNumberDemoIM.imGen.buildAndWrite('en-US-generated.json');
    log.info('Wrote ./en-US-generated.json');
}
