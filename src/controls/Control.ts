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

import { Strings as $ } from '../constants/Strings';
import { ControlAPLRenderProps } from '../responseGeneration/ControlAPLRenderProps';
import { ControlResponseBuilder } from '../responseGeneration/ControlResponseBuilder';
import { SystemAct } from '../systemActs/SystemAct';
import { randomlyPick } from '../utils/ArrayUtils';
import { StringOrList } from '../utils/BasicTypes';
import { DeepRequired } from '../utils/DeepRequired';
import { ControlInput } from './ControlInput';
import { ControlResultBuilder } from './ControlResult';
import { ControlIdentifierType } from './enums/ControlIdentifierType';
import { RenderType } from './enums/RenderType';
import { IControl } from './interfaces/IControl';
import { IControlInput } from './interfaces/IControlInput';

//TODO: hoist common props for all controls to here.
//or at least define interfaces to help developers be consistent.

export type RenderIdentifierFunc = (
    input: IControlInput,
    identifier: string,
    identifierType: ControlIdentifierType,
    renderType: RenderType,
) => string | undefined;

/**
 * Defines the mandatory props of a Control.
 */
export interface ControlProps {
    /**
     * Unique identifier for the control.
     *
     * This must be unique within the scope of the entire control tree.
     */
    id: string;

    rendering?: {
        identifierRenderer?: RenderIdentifierFunc;
    };
}

/**
 * Defines the mandatory state of a Control.
 */
export interface ControlState {
    /**
     * The value managed by a control.
     *
     * Usage:
     * - The value is not necessarily valid, confirmed or otherwise ready for use. Parent
     *   controls and other consumers should `control.isReady()` to determine if the value
     *   is ready for use.
     */
    value: any;

    /**
     * Tracks the last initiative act from the control.
     */
    lastInitiative?: any;
}

export interface ControlInputHandler {
    name: string;
    canHandle: (this: Control, input: ControlInput) => boolean | Promise<boolean>;
    handle: (this: Control, input: ControlInput, resultBuilder: ControlResultBuilder) => void | Promise<void>;
}

export interface ControlInitiativeHandler {
    name: string;
    canTakeInitiative(input: ControlInput): boolean | Promise<boolean>;
    takeInitiative(input: ControlInput, resultBuilder: ControlResultBuilder): void | Promise<void>;
}

/**
 * Base type for the customHandling Functions of a Control
 */
export interface ControlInputHandlingProps {
    /**
     * Custom handling functions
     */
    customHandlingFuncs?: ControlInputHandler[];
}

/**
 * Abstract base class for Controls.
 *
 * Purpose:
 *  - this class provides a simpler way to define a control than direct
 *    implementation of IControl.  Various default implementations are provided.
 *
 * Usage:
 *  - Define new control types by sub-classing this abstract class and providing
 *    implementations for the abstract methods.
 *  - If the custom control will have children, sub-class `ContainerControl`
 *    instead.
 */
export abstract class Control implements IControl {
    readonly id: string;
    state: ControlState;

    constructor(id: string) {
        this.id = id;
        this.state = { value: undefined, lastInitiative: undefined };
    }

    /**
     * Determines if the Control or one of its children can consume a request.
     *
     * Returning `true` does not guarantee that the Control will be selected.
     *
     * Usage:
     * * The handling of a request can and should be contextual. That is, a
     *   control should only return `canHandle = true` if the request makes
     *   sense for the current state of the control.
     *
     * * A @see ContainerControl should return true if one or more of its
     *   children returns `canHandle = true`. Thus the root of a Control tree
     *   should return `canHandle = true` unless the request cannot be
     *   meaningfully consumed by any Control in the tree.
     *
     * * The implementation should be deterministic and effectively memoryless.
     *   i.e. no state changes should be made that would be exposed by
     *   `getSerializableState()`.
     *
     * @param input - Input object. `input.request` contains the request to be
     * handled.
     * @returns `true` if the Control or one of its children can consume the
     * entire request, `false` otherwise.
     */
    abstract canHandle(input: ControlInput): boolean | Promise<boolean>;

    /**
     * Handles the request.
     *
     * Handling a request involves orchestrating state changes to the Control
     * (and its children) and adding response items to the
     * `ControlResultBuilder`.
     *
     * @param input - `input.request` contains the request to be handled.
     * @param resultBuilder - Collect `SystemActs` that represent the system
     * output.
     */
    abstract handle(input: ControlInput, resultBuilder: ControlResultBuilder): void | Promise<void>;

    /**
     * Determines if the Control can take the initiative.
     *
     * Usage:
     * - A control should only return `canTakeInitiative = true` if the control, in its
     *   current state, has something important to ask of the user.  This could be a
     *   necessary elicitation, clarification, confirmation or some other activity to
     *   obtain and finalize the information managed by the Control.
     *
     * - A @see ContainerControl should return `true` if one of its children returns
     *   `canTakeInitiative = true` or if the container needs to ask the user a question
     *   directly. Thus the root of a Control tree should return `canTakeInitiative = true`
     *   if any control in the entire tree reports `canTakeInitiative = true`.
     *
     * - The implementation should be deterministic, idempotent, and effectively
     *   memoryless. Effectively memoryless means that any state changes are temporary and
     *   will not be exposed in the serialized state.
     *
     * Framework behavior:
     * - The initiative phase runs if the handling phase did not produce a responseItem
     *   that has `.takesInitiative = true`.
     *
     * @param input - Input object.
     * @returns `true` if the Control or one of its children can take the initiative,
     * `false` otherwise.
     */
    abstract canTakeInitiative(input: ControlInput): boolean | Promise<boolean>;

    /**
     * Takes initiative by adding an InitiativeAct to the result.
     *
     * Framework behavior:
     * * The initiative phase runs if the handling phase did not produce a
     *   responseItem that has `.takesInitiative = true`.
     *
     * @param input - Input object.
     * @param resultBuilder - ResultBuilder. Collect `SystemActs` that represent
     * the system output.
     */
    abstract takeInitiative(input: ControlInput, resultBuilder: ControlResultBuilder): void | Promise<void>;

    /**
     * Determines if the Control's value is ready for use by other parts of the skill.
     *
     * Note:
     *  - A basic invariant is `isReady === !canTakeInitiative` because `isReady` implies
     *    that no further discussion is required and thus there is no need to take the
     *    initiative.
     *
     * @param input - Input object.
     * @returns `true` if the control has no further questions to ask the user such as
     * elicitation, clarification or confirmation.
     */
    async isReady(input: ControlInput): Promise<boolean> {
        return !(await this.canTakeInitiative(input));
    }

    /**
     * Reestablishes the state of the control.
     *
     * Default implementations:
     *  - `Control`: reestablishes the state via
     *    `this.setSerializableState(state)`.
     *  - `ContainerControl`: reestablishes the `state` and recursively
     *    reestablishes state for all children.
     *  - `DynamicContainerControl`: reestablishes the `state`, rebuilds any
     *    dynamic child controls, and recursively reestablishes state for all
     *    children.
     */
    reestablishState(state: any, controlStateMap: { [index: string]: any }): void {
        if (state !== undefined) {
            this.setSerializableState(state);
        }
    }

    /**
     * Gets the Control's state as an object that is serializable.
     *
     * Only durable state should be included and the object should be
     * serializable with a straightforward application of
     * `JSON.stringify(object)`.
     *
     * Default: `{return this.state;}`
     *
     * Usage:
     *  * This method must be idempotent (multiple calls must not change the
     *    result).
     *  * The default is sufficient for Controls that use the `.state` variable
     *    and only store simple data.
     *    * Non-simple data includes functions, and objects with functions, as
     *      these will not survive the round trip.
     *    * Other non-simple data include types with non-enumerable properties.
     *  * It is safe to pass the actual state object as the framework guarantees
     *    to not mutate it.
     *  * Functions that operate on the Control's state should be defined as
     *    member function of the Control type, or as props.
     *
     * Framework behavior:
     *  * During the shutdown phase the state of the control tree is collected
     *    by calling this function for each control.
     *  * The framework serializes the data use a simple application of
     *    `JSON.stringify`.
     *  * On the subsequent turn the control tree is rebuilt and the state
     *    objects are re-attached to each Control via
     *    `control.setSerializableState(serializedState)`.
     *
     * @returns Serializable object defining the state of the Control
     */
    public getSerializableState(): any {
        return this.state;
    }

    /**
     * Sets the state from a serialized state object.
     *
     * Default: `{this.state = serializedState;}`
     *
     * Usage:
     *  * This method must be idempotent (multiple calls must not change the
     *    result).
     *  * It is safe to use serializedState without copying as the framework
     *    guarantees to not mutate it.
     *
     * Framework behavior:
     *  * During the initialization phase the control tree is rebuilt and state
     *    objects are re-attached to controls by calling this method for each
     *    control.
     *
     * @param serializedState - Serializable object defining the state of the
     * Control
     */
    public setSerializableState(serializedState: any): void {
        this.state = serializedState;
    }

    /**
     * Add response content for a system act produced by this control.
     *
     * This is intended to be used with the default ControlManager.render()
     * which implements a simple concatenation strategy to form a complete
     * response from multiple result items.
     *
     * @param act - System act
     * @param input - Input
     * @param responseBuilder - Response builder
     */
    renderAct(act: SystemAct, input: ControlInput, responseBuilder: ControlResponseBuilder): void {
        // The default is to let the act render itself
        return act.render(input, responseBuilder);
    }

    renderAPLComponent(props: ControlAPLRenderProps, input: ControlInput): { [key: string]: any } {
        throw Error('Not implemented');
    }

    // TODO: remove and/or create a new class... class UnhandledActError extends Error.
    throwUnhandledActError(act: SystemAct): never {
        throw new Error(`No NLG for ${act}`);
    }

    /**
     * Evaluate a prompt prop.
     *
     * @param act - act
     * @param propValue - Constant or function producing String or
     * List-of-Strings
     * @param input - Input object
     */
    evaluatePromptProp(
        act: SystemAct,
        propValue: StringOrList | ((act: any, input: ControlInput) => string | string[]),
        input: ControlInput,
    ): string {
        const stringOrList = typeof propValue === 'function' ? propValue.call(this, act, input) : propValue;
        if (typeof stringOrList === 'string') {
            return stringOrList;
        }
        return randomlyPick<string>(stringOrList);
    }

    /**
     * Evaluate a boolean prop.
     *
     * @param propValue - Constant or function producing boolean
     * @param input - The input object
     */
    evaluateBooleanProp(
        propValue: boolean | ((input: ControlInput) => boolean),
        input: ControlInput,
    ): boolean {
        return typeof propValue === 'function' ? propValue.call(this, input) : propValue;
    }

    /**
     * Evaluate an APL document/data source prop.
     *
     * @param act - act
     * @param input - The input object
     * @param propValue - Constant or function producing a map of key:value pairs
     */
    evaluateAPLProp(
        act: SystemAct,
        input: ControlInput,
        propValue: { [key: string]: any } | ((act: SystemAct, state: ControlState) => { [key: string]: any }),
    ): { [key: string]: any } {
        return typeof propValue === 'function'
            ? (propValue as any).call(this, act, input, this.state)
            : propValue;
    }

    // TODO: make abstract
    getAllTargets(): string[] {
        return [$.Target.It];
    }

    // TODO: make abstract.
    // TODO: maybe it isn't required.. we could scan the targets looking for the relatively-unique ones amongst candidates.
    __getSpecificTarget(): string {
        return $.Target.It;
    }

    // tsDoc from IControl
    renderIdentifier(
        input: ControlInput,
        identifier: string,
        identifierType: ControlIdentifierType,
        renderType: RenderType,
    ): string {
        throw new Error("Not implemented.");
    }
}
