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
import { ControlInput } from '../controls/ControlInput';
import { ControlResultBuilder } from '../controls/ControlResult';
import { IControl } from '../controls/interfaces/IControl';
import { Logger } from '../logging/Logger';

const log = new Logger('AskSdkControls:ControlUtils');

export async function evaluateCustomHandleFuncs(control: IControl, input: ControlInput) {
    const customHandleFuncs: Array<{
        canHandle: (input: ControlInput) => boolean | Promise<boolean>;
        handle: (input: ControlInput, resultBuilder: ControlResultBuilder) => void | Promise<void>;
    }> = (control as any).props.inputHandling.customHandlingFuncs;

    const aplProps = (control as any).props.apl;

    // TODO: Add apl props to all commonControls
    if (aplProps !== undefined) {
        Object.entries(aplProps).forEach(([_key, value]) => {
            if (typeof value === 'object' && 'customHandlingFuncs' in value!) {
                customHandleFuncs.push(...(value as any).customHandlingFuncs);
            }
        });
    }

    for (const { canHandle, handle } of customHandleFuncs) {
        if ((await canHandle(input)) === true) {
            (control as any).handleFunc = handle;
            return true;
        }
    }
    return false;
}

export function logIfBothTrue(customCanHandle: boolean, builtInCanHandle: boolean) {
    if (customCanHandle === true && builtInCanHandle === true) {
        log.warn(
            'Custom canHandle function and built-in canHandle function both returned true. Turn on debug logging for more information',
        );
    }
}
