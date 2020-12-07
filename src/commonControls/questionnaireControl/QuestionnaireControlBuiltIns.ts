import { ControlInput } from '../../controls/ControlInput';
import { DeepRequired } from '../../utils/DeepRequired';
import { QuestionnaireControl, QuestionnaireControlAPLProps } from './QuestionnaireControl';

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

export namespace QuestionnaireControlAPLPropsBuiltIns {
    export interface QuestionnaireChoice {
        ordinalText: string;
        selectedText: string;
        color: string;
        selectedIndex: number;
        //unselectedText: string;
        //selectedTextColor: string,
    }

    export interface QuestionnaireControlAPLContent {
        caption: string;
        questionCaptions: string[];
        choices: QuestionnaireChoice[];
    }

    /*
     * For information about the TextListTemplate, see following doc:
     * https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-alexa-text-list-layout.html
     */
    export const Default: DeepRequired<QuestionnaireControlAPLProps> = {
        enabled: true,

        askQuestion: (control: QuestionnaireControl, input: ControlInput) => {
            const aplContent = {
                document: questionnaireDocumentGenerator(control, input),
                dataSource: questionnaireDataSourceGenerator(control, input),
            };
            return aplContent;
        },
    };

    /**
     * The APL dataSource to use when requesting a value
     *
     * Default: A TextListLayout data source to bind to an APL document.
     * See
     * https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-data-source.html
     */
    export function questionnaireDataSourceGenerator(control: QuestionnaireControl, input: ControlInput) {
        const content = control.getQuestionnaireContent(input);

        const questionItems = [];
        for (const [index, question] of content.questions.entries()) {
            questionItems.push({
                primaryText: question.visualLabel,
                questionId: question.id,
                selectedIndex:
                    control.getChoiceIndexById(content, control.state.value[question.id]?.choiceId) ?? '-1',
            });
        }

        return {
            wrapper: {
                general: {
                    controlId: control.id,
                    dataVersion: 1,
                    radioButtonSize: '85',
                    //radioButtonColor: '',
                    buttonColumnWidth: '124',
                    headerTitle: 'Please answer all that you can',
                    headerSubtitle: null,
                    headerBackButton: false,
                    nextButtonText: 'Complete >',
                },
                questionData: questionItems,
            },
        };
    }

    /**
     * The APL document to use when requesting a value
     *
     * Default: Questionnaire items shown as line items with radio buttons for selecting answer
     */
    export function questionnaireDocumentGenerator(control: QuestionnaireControl, input: ControlInput) {
        const content = control.getQuestionnaireContent(input);

        return {
            type: 'APL',
            version: '1.5',
            import: [
                {
                    name: 'alexa-layouts',
                    version: '1.2.0',
                },
            ],
            layouts: {
                AnswerButton: {
                    parameters: [
                        {
                            name: 'idx',
                            description: 'Index of this button within the group',
                            type: 'number',
                            default: 0,
                        },
                    ],
                    items: {
                        type: 'AlexaRadioButton',
                        checked: '${idx == selectedIndex}',
                        theme: '${theme}',
                        accessibilityLabel: '${accessibilityLabel}',
                        radioButtonHeight: '${radioButtonHeight}',
                        radioButtonWidth: '${radioButtonWidth}',
                        radioButtonColor: '${radioButtonColor}',
                        onPress: [
                            {
                                type: 'SetValue',
                                property: 'selectedIndex',
                                value: '${selectedIndex == idx ? -1 : idx}',
                            },
                            {
                                type: 'SetValue',
                                componentId: 'debugText',
                                property: 'text',
                                value: 'Question: ${questionId}  Selected:${selectedIndex}',
                            },
                            {
                                type: 'SendEvent',
                                arguments: [
                                    '${wrapper.general.controlId}',
                                    'radioClick',
                                    '${questionId}',
                                    '${selectedIndex}',
                                ],
                            },
                        ],
                    },
                },
                QuestionRow: {
                    parameters: [
                        {
                            name: 'primaryText',
                            description: 'Label',
                            type: 'string',
                            default: 'none',
                        },
                        {
                            name: 'selectedIndex',
                            description: 'Which choice is selected',
                            type: 'number',
                            default: -1,
                        },
                        {
                            name: 'questionId',
                            description: 'Which question does this row represent',
                            type: 'string',
                            default: 'none',
                        },
                        {
                            name: 'theme',
                            description:
                                'Colors will be changed depending on the specified theme (light/dark). Defaults to dark theme.',
                            type: 'string',
                            default: 'dark',
                        },
                        {
                            name: 'radioButtonHeight',
                            description: 'Height of the radioButton',
                            type: 'dimension',
                            default: '@radioButtonDefaultHeight',
                        },
                        {
                            name: 'radioButtonWidth',
                            description: 'Width of the radioButton',
                            type: 'dimension',
                            default: '@radioButtonDefaultWidth',
                        },
                        {
                            name: 'buttonColumnWidth',
                            description: 'Width of the radioButton columns',
                            type: 'dimension',
                            default: '@radioButtonDefaultWidth',
                        },
                        {
                            name: 'radioButtonColor',
                            description: 'Selected color of the radioButton',
                            type: 'color',
                            default: "${theme != 'light' ? @colorAccent : '#1CA0CE'}",
                        },
                    ],
                    items: [
                        {
                            type: 'Container',
                            direction: 'row',
                            items: [
                                {
                                    type: 'Container',
                                    width: '${buttonColumnWidth}',
                                    items: {
                                        type: 'AnswerButton',
                                        width: '${radioButtonWidth}',
                                        height: '${radioButtonHeight}',
                                        alignSelf: 'center',
                                        idx: 0,
                                        questionId: '${id}',
                                    },
                                },
                                {
                                    type: 'Container',
                                    width: '${buttonColumnWidth}',
                                    items: {
                                        type: 'AnswerButton',
                                        width: '${radioButtonWidth}',
                                        height: '${radioButtonHeight}',
                                        alignSelf: 'center',
                                        idx: 1,
                                        questionId: '${id}',
                                    },
                                },
                                {
                                    type: 'Text',
                                    text: '${primaryText}',
                                    textAlignVertical: 'center',
                                },
                            ],
                        },
                    ],
                },
            },
            mainTemplate: {
                parameters: ['wrapper'],
                bind: [
                    {
                        name: 'debug',
                        value: true,
                        type: 'boolean',
                    },
                ],
                item: {
                    id: 'root',
                    type: 'Container',
                    width: '100vw',
                    height: '100vh',
                    items: [
                        {
                            type: 'AlexaBackground',
                        },
                        {
                            type: 'AlexaHeader',
                            id: 'heading1',
                            headerDivider: true,
                            headerBackButton: '${wrapper.general.headerBackButton}',
                            headerBackButtonCommand: {
                                type: 'SendEvent',
                                arguments: ['goBack'],
                            },
                            headerTitle: '${wrapper.general.headerTitle}',
                            headerSubtitle: '${wrapper.general.headerSubtitle}',
                        },
                        {
                            type: 'Container',
                            paddingLeft: '@spacingMedium',
                            direction: 'row',
                            items: [
                                {
                                    type: 'Text',
                                    style: 'textStyleHint',
                                    width: '${wrapper.general.buttonColumnWidth}',
                                    text: 'Yes',
                                    textAlign: 'center',
                                },
                                {
                                    type: 'Text',
                                    style: 'textStyleHint',
                                    width: '${wrapper.general.buttonColumnWidth}',
                                    text: 'No',
                                    textAlign: 'center',
                                },
                                {
                                    type: 'Text',
                                    text: '${primaryText}',
                                    textAlignVertical: 'center',
                                },
                            ],
                        },
                        {
                            type: 'ScrollView',
                            shrink: 1,
                            grow: 1,
                            items: [
                                {
                                    type: 'Sequence',
                                    width: '100vw',
                                    height: '80vh',
                                    paddingLeft: '@spacingMedium',
                                    data: '${wrapper.questionData}',
                                    items: {
                                        type: 'QuestionRow',
                                        primaryText: '${data.primaryText}',
                                        questionId: '${data.questionId}',
                                        selectedIndex: '${data.selectedIndex}',
                                        radioButtonColor: '${wrapper.general.radioButtonColor}',
                                        radioButtonHeight: '${wrapper.general.radioButtonSize}',
                                        radioButtonWidth: '${wrapper.general.radioButtonSize}',
                                        buttonColumnWidth: '${wrapper.general.buttonColumnWidth}',
                                    },
                                },
                            ],
                        },
                        {
                            when: '${debug}',
                            type: 'Text',
                            id: 'debugText',
                            text: 'debugInfo',
                            position: 'absolute',
                            bottom: '0vh',
                        },
                        {
                            type: 'AlexaButton',
                            id: 'nextButton',
                            buttonText: '${wrapper.general.nextButtonText}',
                            position: 'absolute',
                            top: '10',
                            right: '10',
                            primaryAction: {
                                type: 'SendEvent',
                                arguments: ['${wrapper.general.controlId}', 'complete'],
                            },
                        },
                    ],
                },
            },
        };
    }
}
