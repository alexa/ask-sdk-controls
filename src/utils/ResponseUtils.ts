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

import { OutputModality, ResponseStyle, ResponseStyleEvaluator } from '../modality/ModalityEvaluation';
import { ControlResponseBuilder } from '../responseGeneration/ControlResponseBuilder';
import { Response } from 'ask-sdk-model';
import { ControlInput } from '../controls/ControlInput';

export interface ResponseStyleBuilderProps {
    voicePrompt: string;
    voiceReprompt?: string;
    responseStyle: ResponseStyle;
    builder: ControlResponseBuilder;
}

export function addFragmentsForResponseStyle(props: ResponseStyleBuilderProps) {
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

export function buildResponseForStyle(props: ResponseStyleBuilderProps): Response {
    addFragmentsForResponseStyle(props);

    return props.builder.build();
}

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
