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
import _ from 'lodash';
import { IControlInput } from './interfaces/IControlInput';
import { IControl } from './interfaces/IControl';
import { InputModality, ResponseStyle } from '../modality/ModalityEvaluation';

/**
 * Properties for creating a ControlInput instance.
 */
export interface ControlInputProps {
    /**
     * The core input for the request.
     */
    handlerInput: HandlerInput;

    /**
     * The turn number of the current request.
     */
    turnNumber: number;

    /**
     * A map of Control IDs to Controls for the current control tree.
     */
    controlMap: { [index: string]: IControl };

    /**
     * The style in which the skill is recommended to respond to the current request,
     * e.g. with a screen or voice interface, based on how the user responded to
     * previous requests.
     */
    suggestedResponseStyle: ResponseStyle;

    /**
     * The history of how the user responded to previous requests,
     * e.g. with touch or voice.
     */
    inputModalityHistory: InputModality[];
}

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
     * This is a convenience for `handlerInput.requestEnvelope.request`.
     */
    readonly request: Request;

    /**
     * The number of incoming requests during the user session.
     */
    readonly turnNumber: number;

    /**
     * The style in which the skill is recommended to respond to the request,
     * e.g. with a screen or voice modality.
     */
    readonly suggestedResponseStyle: ResponseStyle;

    /**
     * The history of what modality the user responded with for each turn,
     * e.g. voice or touch.
     */
    readonly inputModalityHistory: InputModality[];

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

    constructor(props: ControlInputProps) {
        this.handlerInput = props.handlerInput;
        this.request = this.handlerInput.requestEnvelope.request;
        this.turnNumber = props.turnNumber;
        this.controls = props.controlMap;
        this.suggestedResponseStyle = props.suggestedResponseStyle;
        this.inputModalityHistory = props.inputModalityHistory;
    }
}
