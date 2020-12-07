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

import { ControlInput } from './ControlInput';

/**
 * State validation function
 *
 * Takes a Control state object and returns `true` if the state passes validation.  If
 * validation fails, a `ValidationResult` object is returned instead.
 */
export type StateValidationFunction<TState> = (
    state: TState,
    input: ControlInput,
) => true | ValidationFailure | Promise<true | ValidationFailure>;

/**
 * Describes a validation failure.
 *
 * Usage:
 * - A reason code should be provided that uniquely describes the kind of validation
 *   failure.  A reason code is useful for context-specific rendering and other business
 *   function.   It is not mandatory as for some simple cases it may be duplicative to
 *   provide both a reason code and a single rendering of that reason code.
 *
 * - A rendered reason for situations where the rendered form is not context-sensitive and
 *   can be conveniently provided when the ValidationFailure is instantiated.
 */
export type ValidationFailure = {
    /**
     * A code representing what validation failed.
     *
     * Usage:
     *  - use reasonCode for business logic and transform to a prompt during the rendering
     *    phase.
     */
    reasonCode?: string;

    /**
     * A rendered prompt fragment that can be directly included in the `Response`.
     *
     * Usage:
     *  - If convenient, generate the prompt fragment at instantiation time.
     *  - A renderedReason should not be used in logic or further transformed.
     */
    renderedReason?: string;
};

/**
 * Helper to evaluate a prop that accepts one or more StateValidationFunction<TState> functions.
 * @param validationProp - either a single StateValidationFunction<TState> or an array of
 * the same.
 * @param state - The control's state object.
 * @param input - ControlInput.
 */
export async function evaluateValidationProp<TState>(
    validationProp: StateValidationFunction<TState> | Array<StateValidationFunction<TState>>,
    state: TState,
    input: ControlInput,
): Promise<true | ValidationFailure> {
    const listOfValidationFunc: Array<StateValidationFunction<TState>> =
        typeof validationProp === 'function' ? [validationProp] : validationProp;
    for (const validationFunction of listOfValidationFunc) {
        const validationResult: true | ValidationFailure = await validationFunction(state, input);
        if (validationResult !== true) {
            return validationResult;
        }
    }
    return true;
}
