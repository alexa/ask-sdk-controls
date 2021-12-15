/*
 * Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

/**
 * Possible modalities a user can use to respond to a request.
 */
export enum InputModality {
    /**
     * User touched the screen.
     */
    TOUCH = 'touch',
    /**
     * User used their voice.
     */
    VOICE = 'voice',
}

/**
 * Possible modalities with which the skill may respond to a request.
 */
export enum OutputModality {
    /**
     * Response is only displayed on the screen.
     */
    SCREEN = 'screen',

    /**
     * Response is in the form of a voice prompt,
     * and may or may not include content displayed on the screen.
     */
    VOICE = 'voice',

    /**
     * Response type is not yet known.
     */
    INDETERMINATE = 'indeterminate',
}

/**
 * Describes the style in which a request should be responded to.
 * The most basic characteristic is what modality the response should have,
 * but this interface may be extended to describe additional characteristics
 * as desired (e.g. whispering).
 */
export interface ResponseStyle {
    /**
     * The modality with which a request should be responded to.
     */
    modality: OutputModality;
}

/**
 * A function that determines the input modality of a request.
 */
export type InputModalityEvaluator = (input: HandlerInput) => InputModality;

/**
 * A function that suggests the style in which a request should be responded to,
 * based on the content of the request and the history of how the user responded.
 */
export type ResponseStyleEvaluator = (input: HandlerInput, history: InputModality[]) => ResponseStyle;

/**
 * Default functions for determining input modality and response styles.
 */
export namespace ModalityEvaluationDefaults {
    /**
     * Default function for determining the input modality of a request.
     * This is best-effort and may not work in all cases.
     * @param input - Input for the current request
     * @returns InputModality - TOUCH if the request came from a TouchWrapper,
     * VOICE otherwise.
     */
    export function defaultInputModalityEvaluator(input: HandlerInput): InputModality {
        const request = input.requestEnvelope.request;
        if (request.type === 'Alexa.Presentation.APL.UserEvent') {
            if (['TouchWrapper', 'EditText', 'VectorGraphic'].includes(request.source?.type)) {
                return InputModality.TOUCH;
            }
        }
        return InputModality.VOICE;
    }

    /**
     * Default function for suggesting the style in which a request should be responded to.
     * @param input - Input for the current request
     * @param history - History of how the user responded to previous requests.
     * The current request is the last entry.
     * @returns ResponseStyle - SCREEN modality if the last InputModality was TOUCH, VOICE otherwise.
     */
    export function defaultResponseStyleEvaluator(
        input: HandlerInput,
        history: InputModality[],
    ): ResponseStyle {
        if (history?.length > 0 && history[history.length - 1] === InputModality.TOUCH) {
            return { modality: OutputModality.SCREEN };
        }

        return { modality: OutputModality.VOICE };
    }

    /**
     * Function that always returns an INDETERMINATE modality for a suggested ResponseStyle.
     * This is primarily used as the default override function for built-in controls, which results
     * in the controls deferring the decision to the function at the ControlManager level.
     * @returns OutputModality.INDETERMINATE
     */
    export function indeterminateResponseStyleEvaluator(input: HandlerInput, history: InputModality[]) {
        return { modality: OutputModality.INDETERMINATE };
    }
}
