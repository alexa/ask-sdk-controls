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

import { Response } from 'ask-sdk-model';
import { ControlInput } from '../controls/ControlInput';
import { OutputModality, ResponseStyle, ResponseStyleEvaluator } from '../modality/ModalityEvaluation';
import { ControlResponseBuilder } from '../responseGeneration/ControlResponseBuilder';

/**
 * Properties for building a response based on ResponseStyle.
 */
export interface ResponseStyleBuilderProps {
    voicePrompt: string;
    voiceReprompt?: string;
    responseStyle: ResponseStyle;
    builder: ControlResponseBuilder;
}

/**
 * Adds voice prompt and reprompt to a ControlResponseBuilder conditionally based on
 * the ResponseStyle contained in the ResponseStyleBuilderProps.
 *
 * If the modality of the response style is SCREEN, the voice prompt and reprompt
 * will not be added. In any other case, they will be added.
 *
 * @param props - ResponseStyleBuilderProps properties needed for adding prompts to
 * the response.
 */
export function addFragmentsForResponseStyle(props: ResponseStyleBuilderProps): void {
    const voicePrompt = props.voicePrompt;
    const voiceReprompt = props.voiceReprompt;
    const responseStyle = props.responseStyle;

    const builder = props.builder;
    if (responseStyle.modality === OutputModality.SCREEN) {
        return;
    }

    builder.addPromptFragment(voicePrompt);

    if (voiceReprompt !== undefined) {
        builder.addRepromptFragment(voiceReprompt);
    }
}

/**
 * Adds voice prompt and reprompt to a ControlResponseBuilder conditionally based on
 * the ResponseStyle contained in the ResponseStyleBuilderProps.
 *
 * If the modality of the response style is SCREEN, the voice prompt and reprompt
 * will not be added. In any other case, they will be added.
 *
 * After adding the prompts, the response is built.
 *
 * @param props - ResponseStyleBuilderProps properties needed for adding prompts to
 * the response.
 * @returns Response - The response for the current skill turn.
 */
export function buildResponseForStyle(props: ResponseStyleBuilderProps): Response {
    addFragmentsForResponseStyle(props);

    return props.builder.build();
}

/**
 * Executes a ResponseStyleEvaluator override function and determines whether to use
 * the result from it or the base, non-overridden result.
 * @param evaluator - Overridden ResponseStyleEvaluator
 * @param input - ControlInput for the current skill turn
 * @returns ResponseStyle - Uses the result from the provided evaluator if it was
 * determinate, otherwise uses the ResponseStyle present in the provided ControlInput.
 */
export function getDeterminateResponseStyle(
    evaluator: ResponseStyleEvaluator,
    input: ControlInput,
): ResponseStyle {
    const overriddenResponseStyle = evaluator(input.handlerInput, input.inputModalityHistory);

    if (overriddenResponseStyle.modality !== OutputModality.INDETERMINATE) {
        return overriddenResponseStyle;
    }

    return input.suggestedResponseStyle;
}
