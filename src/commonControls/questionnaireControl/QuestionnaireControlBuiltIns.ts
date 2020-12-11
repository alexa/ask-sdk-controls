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

import i18next from 'i18next';
import { ControlInput } from '../../controls/ControlInput';
import { AplContent, QuestionnaireControl } from './QuestionnaireControl';

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

    export interface DefaultAskQuestionProps {
        /**
         * Default: 'Please answer the following..'
         */
        title?: string;

        /**
         * Default (en-*): 'Submit &gt;'
         */
        submitButtonText?: string;

        /**
         * Default: ''
         */
        subtitle?: string;

        /**
         * Whether debug information is displayed
         *
         * Default: false
         */
        debug?: boolean;
    }

    export function defaultAskQuestion(
        props: DefaultAskQuestionProps,
    ): (control: QuestionnaireControl, input: ControlInput) => AplContent {
        return (control: QuestionnaireControl, input: ControlInput) => {
            return {
                document: questionnaireDocumentGenerator(control, input),
                dataSource: questionnaireDataSourceGenerator(control, input, props),
            };
        };
    }

    /**
     * The APL dataSource to use when requesting a value
     *
     * Default: A TextListLayout data source to bind to an APL document.
     * See
     * https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-data-source.html
     */
    export function questionnaireDataSourceGenerator(
        control: QuestionnaireControl,
        input: ControlInput,
        contentProps: DefaultAskQuestionProps,
    ) {
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
                    buttonColumnWidth: '124',
                    headerTitle:
                        contentProps.title ?? i18next.t('QUESTIONNAIRE_CONTROL_DEFAULT_APL_HEADER_TITLE'),
                    headerSubtitle: contentProps.subtitle ?? '',
                    headerBackButton: false,
                    nextButtonText:
                        contentProps.submitButtonText ??
                        i18next.t('QUESTIONNAIRE_CONTROL_DEFAULT_APL_SUBMIT_TEXT'),
                    debug: contentProps.debug ?? false,
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
                        disabled: '${disableContent}',
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
                item: {
                    id: 'root',
                    type: 'Container',
                    width: '100vw',
                    height: '100vh',
                    bind: [
                        {
                            name: 'disableContent',
                            value: false,
                            type: 'boolean',
                        },
                        {
                            name: 'enableWaitIndicator',
                            value: false,
                            type: 'boolean',
                        },
                    ],
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
                            when: '${wrapper.general.debug}',
                            type: 'Text',
                            id: 'debugText',
                            text: 'debugInfo',
                            position: 'absolute',
                            bottom: '0vh',
                        },
                        {
                            type: 'AlexaButton',
                            id: 'nextButton',
                            disabled: '${disableContent}',
                            buttonText: '${wrapper.general.nextButtonText}',
                            position: 'absolute',
                            top: '10',
                            right: '10',
                            primaryAction: {
                                type: 'Sequential',
                                commands: [
                                    {
                                        type: 'SetValue',
                                        componentId: 'debugText',
                                        property: 'text',
                                        value: 'Complete',
                                    },
                                    {
                                        type: 'SetValue',
                                        componentId: 'root',
                                        property: 'disableContent',
                                        value: true,
                                    },
                                    {
                                        type: 'SendEvent',
                                        arguments: ['${wrapper.general.controlId}', 'complete'],
                                    },
                                    {
                                        type: 'SetValue',
                                        componentId: 'root',
                                        property: 'enableWaitIndicator',
                                        value: true,
                                        delay: 1370,
                                    },
                                ],
                            },
                        },
                        {
                            type: 'AlexaProgressDots',
                            position: 'absolute',
                            display: "${enableWaitIndicator ? 'normal' : 'invisible'}",
                            top: '50vh',
                            right: '20dp',
                            dotSize: '12dp',
                            componentId: 'largeDotsId',
                            spacing: '@spacingMedium',
                        },
                    ],
                },
            },
        };
    }
}
