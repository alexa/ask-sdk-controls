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

import { ControlIdentifierType } from '../enums/ControlIdentifierType';
import { RenderType } from '../enums/RenderType';
import { IControlInput } from './IControlInput';
import { IControlResultBuilder } from './IControlResultBuilder';

/**
 * Defines a Control object that manages state and dialog behavior.
 *
 * This is the minimal definition required by the Runtime (ControlHandler)
 * See `Control` for the actual class used by Control implementations.
 */
export interface IControl {
    id: string;

    /**
     * Determines if the Control or one of its children can consume the request.
     */
    canHandle(input: IControlInput): boolean | Promise<boolean>;

    /**
     * Handles the request.
     */
    handle(input: IControlInput, resultBuilder: IControlResultBuilder): void | Promise<void>;

    /**
     * Determines if the Control can take the initiative.
     */
    canTakeInitiative(input: IControlInput): boolean | Promise<boolean>;

    /**
     * Takes the initiative by adding an InitiativeAct to the result.
     */
    takeInitiative(input: IControlInput, resultBuilder: IControlResultBuilder): void | Promise<void>;

    /** TODO */
    reestablishState(state: any, controlStateMap: { [index: string]: any }): void;

    /**
     * Gets the Control's state as an object that is serializable.
     *
     * Framework behavior:
     * - The object will be serialized via a call to `JSON.stringify(obj)`
     */
    getSerializableState(): any;

    /**
     * Sets the state from a serialized state object
     */
    setSerializableState(serializedState: any): void;

    /**
     * Render an identifier associated with a Control as a user-facing string for the user-interface.
     * 
     * Default: returns the identifier verbatim
     * 
     * Purpose:
     *  - Skills may need to talk about their controls, targets, actions, and so on.
     *  - To assist in this, Controls can render their identifiers into user-facing forms.
     *  - For example, a target-disambiguation question may be formed if the user under-specifies an input
     *      "U: change my name to Jenkins"
     *    A container control may form the basic question but does not natively know how to render the details for each control
     *      "A: Did you mean {controlA-target1} or {controlB-target2}".
     *    To form a complete prompt, the Container asks the controls to render their targets, to produce something like:
     *      "Did you mean your given name or your surname?"
     * 
     * Example
     *  - A DateRangeControl might render its 'startDate' target as "your vacation start date"
     *  - The same control might render its 'change' action as "update or replace".
     * Note:
     *  - The complete prompt for a dialog act, or set of acts, can be overridden in ControlManager.render.
     * 
     * @param input - Input object
     * @param identifier - the Identifier to be rendered
     * @param identifierType - the type of identifier being rendered
     * @param destination - where the rendered form will be used (voice or screen).
     
     */
    renderIdentifier(
        input: IControlInput,
        identifier: string,
        identifierType: ControlIdentifierType,
        renderType: RenderType,
    ): string;
}
