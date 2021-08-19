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

import { ResponseFactory } from 'ask-sdk-core';
import { Response, ui } from 'ask-sdk-model';
import { expect } from 'chai';
import { suite, test } from 'mocha';
import { OutputModality } from '../../src/modality/ModalityEvaluation';
import { ControlResponseBuilder } from '../../src/responseGeneration/ControlResponseBuilder';
import { buildResponseForStyle } from '../../src/utils/ResponseUtils';

suite('== ResponseUtils.buildResponseForStyle ==', () => {
    let builder: ControlResponseBuilder;
    const voicePrompt = 'voicePrompt';
    const voiceReprompt = 'voiceReprompt';

    beforeEach(() => {
        builder = new ControlResponseBuilder(ResponseFactory.init());
    });

    test('Voice prompts and reprompts are ignored for screen modality', async () => {
        const { voicePromptResponse, voiceRepromptResponse } = getSsmlFromResponse(
            buildResponseForStyle({
                voicePrompt,
                voiceReprompt,
                responseStyle: { modality: OutputModality.SCREEN },
                builder,
            }),
        );

        expect(voicePromptResponse).equal(getSsmlString());
        expect(voiceRepromptResponse).equal(getSsmlString());
    });

    test('Voice prompts are included for voice modality', async () => {
        const { voicePromptResponse, voiceRepromptResponse } = getSsmlFromResponse(
            buildResponseForStyle({
                voicePrompt,
                responseStyle: { modality: OutputModality.VOICE },
                builder,
            }),
        );

        expect(voicePromptResponse).equal(getSsmlString(voicePrompt));
        expect(voiceRepromptResponse).equal(getSsmlString());
    });

    test('Voice reprompts are included for voice modality', async () => {
        const { voicePromptResponse, voiceRepromptResponse } = getSsmlFromResponse(
            buildResponseForStyle({
                voicePrompt,
                voiceReprompt,
                responseStyle: { modality: OutputModality.VOICE },
                builder,
            }),
        );

        expect(voicePromptResponse).equal(getSsmlString(voicePrompt));
        expect(voiceRepromptResponse).equal(getSsmlString(voiceReprompt));
    });

    function getSsmlString(prompt?: string) {
        return `<speak>${prompt ?? ''}</speak>`;
    }

    function getSsmlFromResponse(response: Response) {
        return {
            voicePromptResponse: (response.outputSpeech as ui.SsmlOutputSpeech).ssml,
            voiceRepromptResponse: (response.reprompt?.outputSpeech as ui.SsmlOutputSpeech)?.ssml,
        };
    }
});
