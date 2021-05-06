import { SkillBuilders } from 'ask-sdk-core';
import { Control } from '../../..//src/controls/Control';
import { QuestionnaireControl } from '../../../src/commonControls/questionnaireControl/QuestionnaireControl';
import { QuestionnaireControlAPLPropsBuiltIns } from '../../../src/commonControls/questionnaireControl/QuestionnaireControlBuiltIns';
import { ControlManager } from '../../../src/controls/ControlManager';
import { ControlHandler } from '../../../src/runtime/ControlHandler';
import { DemoRootControl } from '../../Common/src/DemoRootControl';

export namespace MultipleLists {
    export class DemoControlManager extends ControlManager {
        createControlTree(): Control {
            const rootControl = new DemoRootControl({ id: 'root' });

            rootControl.addChild(
                new QuestionnaireControl({
                    id: 'healthScreen',

                    questionnaireData: {
                        questions: [
                            {
                                id: 'headache',
                                targets: ['headache'],
                                //TODO: support functions on prompt/label/shortForm
                                prompt: 'Do you frequently have a headache?',
                                visualLabel: 'Frequent headache?',
                                promptShortForm: (control, input) => 'headache',
                            },
                            {
                                id: 'cough',
                                targets: ['cough'],
                                prompt: 'Have you been coughing a lot?',
                                visualLabel: 'Cough most days?',
                                promptShortForm: 'cough',
                            },
                        ],
                        choices: [
                            {
                                id: 'yes',
                                //TODO: values: .. allow additional values. default to id
                                aplColumnHeader: 'yes', //TODO: default to id
                                prompt: 'yes', //TODO: default to id
                            },
                            {
                                id: 'no',
                                aplColumnHeader: 'no',
                                prompt: 'no',
                            },
                        ], // TODO: should be consistent with ListControl. listItemIds vs choices.
                    },
                    interactionModel: {
                        slotType: 'YesNo', // TODO: allow multiple slotTypes? e.g. to support YesNo and Symptom.
                        filteredSlotType: 'none',
                        targets: ['builtin_it', 'builtin_questionnaire', 'healthQuestionnaire'], // this should just be the control targets.  The question targets are in content.
                    },
                    dialog: {
                        confirmationRequired: false,
                    },
                    apl: {
                        askQuestion: QuestionnaireControlAPLPropsBuiltIns.DefaultAskQuestion({
                            radioButtonPressesBlockUI: false,
                        }),
                    },
                    prompts: {
                        questionnaireCompleted: () => '',
                        questionAnsweredAct: (act, input) =>
                            /* Demonstrate a contextual prompt. This skips voice feedback
                         when the screen provides sufficient feedback (which is true for
                         all questions except the last) */
                            `${
                                act.payload.questionId !== 'cough' /* && APL device  */
                                    ? ''
                                    : act.payload.renderedChoice +
                                      ' for ' +
                                      act.payload.renderedQuestionShortForm +
                                      '.'
                            }`,
                    },
                }),
            );

            rootControl.addChild(
                new QuestionnaireControl({
                    id: 'healthScreenPart2',

                    questionnaireData: {
                        questions: [
                            {
                                id: 'foot',
                                targets: ['foot'],
                                //TODO: support functions on prompt/label/shortForm
                                prompt: 'Do you have a sore foot?',
                                visualLabel: 'Sore foot?',
                                promptShortForm: 'sore foot',
                            },
                            {
                                id: 'back',
                                targets: ['back'],
                                prompt: 'Do you have a sore back?',
                                visualLabel: 'Sore back?',
                                promptShortForm: 'sore back',
                            },
                        ],
                        choices: [
                            {
                                id: 'yes',
                                //TODO: values: .. allow additional values. default to id
                                aplColumnHeader: 'yes', //TODO: default to id
                                prompt: 'yes', //TODO: default to id
                            },
                            {
                                id: 'no',
                                aplColumnHeader: 'no',
                                prompt: 'no',
                            },
                        ], // TODO: should be consistent with ListControl. listItemIds vs choices.
                    },
                    interactionModel: {
                        slotType: 'YesNo', // TODO: allow multiple slotTypes? e.g. to support YesNo and Symptom.
                        filteredSlotType: 'none',
                        targets: ['builtin_it', 'builtin_questionnaire'], // this should just be the control targets.  The question targets are in content.
                    },
                    dialog: {
                        confirmationRequired: false,
                    },
                }),
            );

            return rootControl;
        }
    }
}

export const handler = SkillBuilders.custom()
    .addRequestHandlers(new ControlHandler(new MultipleLists.DemoControlManager()))
    .lambda();
