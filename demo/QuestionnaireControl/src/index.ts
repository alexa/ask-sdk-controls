import { SkillBuilders } from 'ask-sdk-core';
import { Control } from '../../..//src/controls/Control';
import { QuestionnaireControl } from '../../../src/commonControls/questionnaireControl/QuestionnaireControl';
import { ControlManager } from '../../../src/controls/ControlManager';
import { ControlHandler } from '../../../src/runtime/ControlHandler';
import { DemoRootControl } from '../../Common/src/DemoRootControl';

export namespace MultipleLists {
    export class DemoControlManager extends ControlManager {
        createControlTree(): Control {
            const rootControl = new DemoRootControl({ id: 'root' });

            // Call it MultiListControl?
            //  list one is "what day": mon, tues, wed
            //  list two is "how many?": a few, lots.

            // Call it ManyListsControlWithSameChoices?... one 'list' but with lots of different questions associated.
            //   -- must be short lists.
            //   -- each list is an (id,targets) pair with associated
            //   prompts/reprompt/aplMappers
            //   Keep it as questionnaire for now and describe is as 'like a multi-list
            //   but with many special aspects'/

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
                                promptShortForm: 'headache',
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
                        targets: ['builtin_it', 'builtin_questionnaire','healthQuestionnaire'], // this should just be the control targets.  The question targets are in content.
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
