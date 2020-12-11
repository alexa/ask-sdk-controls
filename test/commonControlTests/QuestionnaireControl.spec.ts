/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License').
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the 'license' file accompanying this file. This file is distributed
 * on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { ResponseFactory } from 'ask-sdk-core';
import { expect } from 'chai';
import { suite, test } from 'mocha';
import { ActiveAPLInitiativeAct, ControlResponseBuilder, GeneralControlIntent } from '../../src';
import { QuestionnaireControl } from '../../src/commonControls/questionnaireControl/QuestionnaireControl';
import { Strings } from '../../src/constants/Strings';
import { Control } from '../../src/controls/Control';
import { ControlManager } from '../../src/controls/ControlManager';
import { ControlHandler } from '../../src/runtime/ControlHandler';
import { IntentBuilder } from '../../src/utils/IntentUtils';
import { SkillInvoker } from '../../src/utils/testSupport/SkillInvoker';
import { TestInput, testTurn, waitForDebugger } from '../../src/utils/testSupport/TestingUtils';

waitForDebugger();

/*
  TODO:
    - answer question with the answer in feedback slot. (FeedbackAnswerToSpecificQuestion)
    - questionnaire with three choices, perhaps four.
    - User ignores the prompt and directly answers a question of their choosing, via an
      alternate value. ie say "I often cough" rather than "yes to cough".
     - allow the value to come via preposition, cf via feedback.
<<<<<<< HEAD
    - test default content is present in APL (not necessarily the precise details. !undefined, !dummy, etc.)
=======
   
>>>>>>> develop
 */

suite('QuestionnaireControl e2e tests', () => {
    interface TestProps {
        confirmationRequired: boolean;
    }

    function createControlManager(props: TestProps): ControlManager {
        return new (class extends ControlManager {
            createControlTree(): Control {
                return new QuestionnaireControl({
                    id: 'question',
                    questionnaireData: {
                        questions: [
                            {
                                id: 'headache',
                                targets: ['headache'],
                                prompt: 'Do you frequently have a headache?',
                                visualLabel: 'Do you frequently have a headache?',
                                promptShortForm: 'headache',
                            },
                            {
                                id: 'cough',
                                targets: ['cough'],
                                prompt: 'Have you been coughing a lot?',
                                visualLabel: 'Have you been coughing a lot?',
                                promptShortForm: 'cough',
                            },
                        ],
                        choices: [
                            {
                                id: 'yes',
                                aplColumnHeader: 'Yes',
                                prompt: 'yes',
                            },
                            {
                                id: 'no',
                                aplColumnHeader: 'No',
                                prompt: 'no',
                                selectedCharacter: '✖',
                            },
                        ],
                    },
                    interactionModel: {
                        slotType: 'YesNoMaybe',
                        filteredSlotType: 'Maybe',
                    },
                    dialog: {
                        confirmationRequired: props.confirmationRequired,
                    },
                    prompts: {
                        questionAnsweredAct: '',
                    },
                });
            }
        })();
    }

    test('basics, confirmation=false', async () => {
        const requestHandler = new ControlHandler(createControlManager({ confirmationRequired: false }));
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.of(GeneralControlIntent.of({ action: Strings.Action.Start })),
            'A: Do you frequently have a headache?',
        );

        await testTurn(
            invoker,
            'U: yes',
            TestInput.of(IntentBuilder.of('AMAZON.YesIntent')),
            'A: Have you been coughing a lot?',
        );

        await testTurn(
            invoker,
            'U: yes',
            TestInput.of(IntentBuilder.of('AMAZON.YesIntent')),
            'A: Great, thank you.',
        );
    });

    test('basics, confirmation=true', async () => {
        const requestHandler = new ControlHandler(createControlManager({ confirmationRequired: true }));
        const invoker = new SkillInvoker(requestHandler);
        await testTurn(
            invoker,
            'U: __',
            TestInput.of(GeneralControlIntent.of({ action: Strings.Action.Start })),
            'A: Do you frequently have a headache?',
        );

        await testTurn(
            invoker,
            'U: yes',
            TestInput.of(IntentBuilder.of('AMAZON.YesIntent')),
            'A: Have you been coughing a lot?',
        );

        await testTurn(
            invoker,
            'U: yes',
            TestInput.of(IntentBuilder.of('AMAZON.YesIntent')),
            'A: Are you happy with all answers?',
        );
    });

    /**
     * User presses a radio button to answer an arbitrary question.
     * 1. state is updates
     * 2. no voice prompt.
     * 3. no new APL.
     */
    test('answering by touch', async () => {
        const controlManager = createControlManager({ confirmationRequired: false });
        const requestHandler = new ControlHandler(controlManager);
        const invoker = new SkillInvoker(requestHandler);

        const response = await testTurn(
            invoker,
            'U: <Press "no" for "have cough">',
            TestInput.simpleUserEvent(['question', 'radioClick', 'cough', 1]),
            'A: ',
        );

        expect((response.directive = undefined)); // no APL after touch events.  It is already updated on client side.

        expect(requestHandler.getSerializableControlStates().question.value).deep.equals({
            cough: {
                choiceId: 'no',
            },
        });

        const response2 = await testTurn(
            invoker,
            'U: <Press "yes" for "have headache">',
            TestInput.simpleUserEvent(['question', 'radioClick', 'headache', 0]),
            'A: ', // implicit completion should _not occur_
        );

        expect(requestHandler.getSerializableControlStates().question.value).deep.equals({
            cough: {
                choiceId: 'no',
            },
            headache: {
                choiceId: 'yes',
            },
        });
    });

    // /**
    //  * Ensure that ResponseBuilder.isDisplayUsed is set when ActiveAPLInitiative produced.
    //  */
    test('ActiveAPLInitiative causes response.isDisplayUsed = true', async () => {
        const controlManager = createControlManager({ confirmationRequired: false });
        const questionnaireControl = controlManager.createControlTree();
        const touchInput = TestInput.simpleUserEvent(['healthScreen', 'radioClick', 'cough', 1]);
        const responseBuilder = new ControlResponseBuilder(ResponseFactory.init());
        questionnaireControl.renderAct(
            new ActiveAPLInitiativeAct(questionnaireControl),
            touchInput,
            responseBuilder,
        );
        expect(responseBuilder.isDisplayUsed()).true; // display marked as used.
    });
});
