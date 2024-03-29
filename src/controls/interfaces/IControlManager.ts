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

import { HandlerInput } from 'ask-sdk-core';
import { InputModality, ResponseStyle } from '../../modality/ModalityEvaluation';
import { ControlResponseBuilder } from '../../responseGeneration/ControlResponseBuilder';
import { IControl } from './IControl';
import { IControlInput } from './IControlInput';
import { IControlResult } from './IControlResult';

/**
 * Manages a skill built with Controls.
 *
 * This is the minimal definition required by the Runtime (ControlHandler)
 * See `ControlManager` for the actual class used by implementations.
 */
export interface IControlManager {
    /**
     * Creates the tree of controls to handle state management and dialog
     * decisions for the skill.
     *
     * Usage:
     * - A single control is legal and will suffice for small skills. For larger
     *   skills a tree of controls structured using @see ContainerControl will
     *   help manage skill complexity.
     *
     * - In advanced scenarios with dynamic control tree shapes, this method
     *   should produce only the static section of the tree.  The dynamic
     *   portion is
     *   expected to produce a tree that is identical to the tree at the end of
     *   the previous turn.  The serializable control state can be inspected as
     *   necessary.
     *
     * - If state objects are re-established during this method, the subsequent
     *
     * @param controlStateMap - Map of control state objects keyed by
     *                       `controlId` This is provided for advanced cases
     *                       in which the tree has a dynamic shape based on
     *                       the application state.
     * @returns A Control that is either a single @see Control or a @see
     * ContainerControl that is the root of a tree.
     */
    createControlTree(): IControl;

    reestablishControlStates(rootControl: IControl, stateMap: { [key: string]: any }): void;

    /**
     * Builds the response.
     *
     * @param result - The result to be rendered
     * @param input - Input
     * @param responseBuilder - Response builder
     */
    render(
        result: IControlResult,
        input: IControlInput,
        responseBuilder: ControlResponseBuilder,
    ): void | Promise<void>;

    /**
     * Custom handling of a internal error.
     *
     * @param input - ControlInput object or undefined if an error occurs early in processing
     * @param error - Error object
     * @param responseBuilder - Response builder
     */
    handleInternalError?(
        input: IControlInput | undefined,
        error: any,
        responseBuilder: ControlResponseBuilder,
    ): void;

    /**
     *
     */
    loadControlStateMap(handlerInput: HandlerInput): Promise<{ [key: string]: any }>;

    /**
     *
     */
    saveControlStateMap(state: any, handlerInput: HandlerInput): Promise<void>;

    /**
     * Determines the input modality of the current turn, based on the
     * currently-configured evaluator function.
     * @param handlerInput - Input for the current turn.
     * @returns InputModality - Input modality determined for the current turn.
     */
    evaluateInputModality(handlerInput: HandlerInput): InputModality;

    /**
     * Determines the recommended response style for the current turn, based on the
     * current-configured evaluator function.
     * @param handlerInput - Input for the current turn.
     * @param history - History of input modality of previous turns.
     * @returns ResponseStyle - Recommended response style for the current turn.
     */
    evaluateResponseStyle(input: HandlerInput, history: InputModality[]): ResponseStyle;
}
