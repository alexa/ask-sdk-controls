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
import { Request } from 'ask-sdk-model';
import { APLMode } from '../responseGeneration/AplMode';
import { IControl } from './interfaces/IControl';
import { IControlInput } from './interfaces/IControlInput';

/**
 * Defines an expanded input object passed around during processing by Controls.
 *
 * Purpose:
 *   * Provides access to the HandlerInput and also conveniences such as simplified access
 *     to the Request object, a turn counter and a map of all controls in the control tree.
 */
export class ControlInput implements IControlInput {
    /**
     * The input from {@link CustomSkillRequestHandler}
     */
    readonly handlerInput: HandlerInput;

    /**
     * The request object
     *
     * The request object that should be processed during canHandle.
     *
     * Usage:
     *  * In essentially all cases `request` can be treated as `the request`.  If you need to know if
     *    it is a stashed value or if you absolutely need `this turns original request`, use `originalRequest`
     *  * If a Container is directly handling an input (e.g. a custom intent), it is preferable to manipulate the child control
     *    directly rather than constructing a modified request object.  I.e. don't manufacture new Request objects.
     *  * The only intended scenario is to stash a request from one turn then pass it to a child on a subsequent turn.
     * 
     * Purpose:
     * * In scenarios with user-input ambiguity we often need to stash the original request until we work
     *   out how best to process it. A common solution is to ask the user how to resolve the situation 
     *   and then proceed with this extra information by routing the original request appropriately.
     * 
     * Note:
     *  * Because of the limited scenarios where this should be modified, it is marked readonly. 
     *    Mutate with caution.
     */
    readonly request: Request;

    /**
     * The original request object
     *
     * This is a convenience copy of `handlerInput.requestEnvelope.request` and never changes.
     */
    readonly originalRequest: Request;

    /**
     * The number of incoming requests during the user session.
     */
    readonly turnNumber: number;

    /**
     * All the controls of the control tree, indexed by controlID.
     *
     * Usage:
     *  * This provides direct access to all other controls in the control tree which
     *    can be convenient for occasional use but it increases the coupling of specific controls.
     *  * When controls are close to one another, it is preferable to have their parents
     *    coordinate data transfer, e.g. by get() from one and set() on the other.
     *  * If controls that are not close to one another routinely need to share information
     *    it would be best to create an external datastore. Consider Redux or similar solutions.
     */
    readonly controls: { [index: string]: IControl };

    /**
     * APL rendering mode
     */
    readonly aplMode: APLMode;

    constructor(
        handlerInput: HandlerInput,
        turnNumber: number,
        controlMap: { [index: string]: IControl },
        aplMode: APLMode,
    ) {
        this.handlerInput = handlerInput;
        this.request = this.handlerInput.requestEnvelope.request;
        this.originalRequest = this.handlerInput.requestEnvelope.request;
        this.turnNumber = turnNumber;
        this.controls = controlMap;
        this.aplMode = aplMode;
    }
}
