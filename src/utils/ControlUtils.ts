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
import { Control, ControlInputHandler, CustomControlInputHandler } from '../controls/Control';
import { ControlInput } from '../controls/ControlInput';
import { Logger } from '../logging/Logger';

const log = new Logger('AskSdkControls:ControlUtils');

/*
 * //    TODO: tighten up the contract.. what props are supported, precisely.
 *       probably also good to factor into gatherFuncs() and evaluateFuncs()
 
 * //    TODO: tighten by refactoring NumberControl/DateRangeControl canHandle.
/**
 * Evaluate the Input handlers
 *
 *  Handlers can be defined in two places:
 *  1. `props.inputHandling.customHandlingFuncs`, and
 *  2. `props.apl.customHandlingFuncs`
 * @param control - control
 * @param input - input
 */
export async function evaluateInputHandlers(control: Control, input: ControlInput): Promise<boolean> {
    const stdHandlers = (control as any).standardInputHandlers ?? [];
    const customHandlers = ((control as any).props.inputHandling ?? []).customHandlingFuncs ?? [];

    const aplProps = (control as any).props.apl;

    // TODO: deprecate apl customHandlers prop
    if (aplProps !== undefined) {
        Object.entries(aplProps).forEach(([_key, value]) => {
            if (typeof value === 'object' && 'customHandlingFuncs' in value!) {
                customHandlers.push(...(value as any).customHandlingFuncs);
            }
        });
    }

    const stdHandlerMatches = await getMatchingHandlers(stdHandlers, control, input);
    const customHandlerMatches = await getMatchingHandlers(customHandlers, control, input);

    const allMatchingHandlers = customHandlerMatches.concat(stdHandlerMatches);
    if (allMatchingHandlers.length === 0) {
        log.error(`No matching handlers`);
        return false;
    } else if (allMatchingHandlers.length === 2) {
        if (
            (allMatchingHandlers[0] as CustomControlInputHandler).standardOverrides?.includes(
                allMatchingHandlers[1].name,
            ) === true
        ) {
            (control as any).handleFunc = allMatchingHandlers[0].handle.bind(control as any);
            return true;
        } else {
            throw new Error(
                `Matching custom and standard handler found in control: ${control.id}. Handlers in a single control should be mutually exclusive. ` +
                    `handlers: ${JSON.stringify(allMatchingHandlers.map((x) => x.name))}.` +
                    `One solution is to set the standardOverrides prop in the customHandlerFunc to override the standard built in handler.`,
            );
        }
    } else {
        (control as any).handleFunc = allMatchingHandlers[0].handle.bind(control as any);
        return true;
    }

    /*
    const matches = [];
    for (const handler of customHandlers.concat(stdHandlers)) {
        if ((await handler.canHandle.call(control as any, input)) === true) {
            matches.push(handler);
        }
    }

    if (matches.length > 1) {
        throw new Error(
            `More than one handler matched. Handlers in a single control should be mutually exclusive. ` +
                `Defaulting to the first. handlers: ${JSON.stringify(matches.map((x) => x.name))}`,
        );
    }

    if (matches.length >= 1) {
        (control as any).handleFunc = matches[0].handle.bind(control as any);
        return true;
    } else {
        return false;
    }*/
}

async function getMatchingHandlers(handlers: ControlInputHandler[], control: Control, input: ControlInput) {
    const matchingHandlers: ControlInputHandler[] = [];
    for (const handler of handlers) {
        if ((await handler.canHandle.call(control as any, input)) === true) {
            matchingHandlers.push(handler);
        }
    }
    if (matchingHandlers.length > 1) {
        throw new Error(
            `More than one handler matched in control ${control.id}. Handlers in a single control should be mutually exclusive. ` +
                `handlers: ${JSON.stringify(matchingHandlers.map((x) => x.name))}`,
        );
    }
    return matchingHandlers;
}

//Exported for internal use only. Not sufficiently well-defined or valuable for public export.
export function _logIfBothTrue(customCanHandle: boolean, builtInCanHandle: boolean) {
    if (customCanHandle === true && builtInCanHandle === true) {
        log.warn(
            'Custom canHandle function and built-in canHandle function both returned true. Turn on debug logging for more information',
        );
    }
}

/**
 * Selects the first control with specific ID from an array.
 *
 * Behavior:
 * - implemented by linear search.
 * - if more than one control matches, the first is returned.
 * - if parameter `id` is undefined, returns `undefined`.
 * - if there is no control with matching id, returns `undefined`.
 *
 * @param controls - Controls
 * @param childId - The id to match
 * @returns - The matching childControl, or undefined if not present.
 */
export function findControlById(controls: Control[], id: string | undefined): Control | undefined {
    if (id === undefined) {
        return undefined;
    }
    return controls.find((c) => c.id === id);
}
