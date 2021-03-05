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

import { IControlManager } from '..';
import { Logger } from '../logging/Logger';
import { APLMode } from '../responseGeneration/AplMode';
import { ControlResponseBuilder } from '../responseGeneration/ControlResponseBuilder';
import { ControlInput } from './ControlInput';
import { ControlManager, renderActsInSequence } from './ControlManager';
import { ControlResult } from './ControlResult';

const log = new Logger('AskSdkControls:ComponentModeControlManager');

/**
 *  ControlManager used to render APL in Component Mode.
 */
export abstract class ComponentModeControlManager extends ControlManager implements IControlManager {
    async render(
        result: ControlResult,
        input: ControlInput,
        controlResponseBuilder: ControlResponseBuilder,
    ): Promise<void> {
        // set the APL mode to Component
        // Required to disable addRenderAPLDirective on control.renderActs()
        controlResponseBuilder.aplMode = APLMode.COMPONENT;

        await renderActsInSequence(result.acts, input, controlResponseBuilder);
        await this.renderAPL(result, input, controlResponseBuilder);
    }

    /**
     * Render an APL template.
     *
     * @param input - Input
     * @param controlResponseBuilder - Response builder
     */
    abstract renderAPL(
        result: ControlResult,
        input: ControlInput,
        controlResponseBuilder: ControlResponseBuilder,
    ): Promise<void>;
}
