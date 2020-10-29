import i18next from 'i18next';
import { RequestChangedValueByListAct } from '../..';
import { ControlState } from '../../controls/Control';
import { ControlInput } from '../../controls/ControlInput';
import { AplContent, MultiValueListControl } from './MultiValueListControl';

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

export namespace MultiValueListControlAPLPropsBuiltIns {
    export interface DefaultSelectValueProps {
        /**
         * Default: 'Create your list'
         */
        title?: string;

        /**
         * Default (en-*): 'Submit &gt;'
         */
        submitButtonText?: string;

        /**
         * Default: 'Say an Item or touch it to add it your list'
         */
        subtitle?: string;

        /**
         * Whether debug information is displayed
         *
         * Default: false
         */
        debug?: boolean;

        /**
         * Function that maps the MultiValueListControlState.value to rendered value that
         * will be presented to the user as a list.
         *
         * Default: returns the value unchanged.
         */
        valueRenderer: (choice: string, input: ControlInput) => string;
    }

    export function defaultSelectValue(
        props: DefaultSelectValueProps,
    ): (control: MultiValueListControl, input: ControlInput) => AplContent {
        return (control: MultiValueListControl, input: ControlInput) => {
            return {
                document: multiValueListDocumentGenerator(control, input),
                dataSource: multiValueListDataSourceGenerator(control, input, props),
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
    export function multiValueListDataSourceGenerator(
        control: MultiValueListControl,
        input: ControlInput,
        contentProps: DefaultSelectValueProps,
    ) {
        const listOfChoices = [];
        const selectedChoices = [];

        const choices = control.getChoicesList(input);
        for (const item of choices) {
            listOfChoices.push({
                primaryText: contentProps.valueRenderer(item, input),
            });
        }

        const selections = control.getSlotIds();
        for (const item of selections) {
            selectedChoices.push({
                primaryText: contentProps.valueRenderer(item, input),
            });
        }

        return {
            general: {
                headerTitle:
                    contentProps.title ?? i18next.t('MULTIVALUELIST_CONTROL_DEFAULT_APL_HEADER_TITLE'),
                headerSubitle:
                    contentProps.subtitle ?? i18next.t('MULTIVALUELIST_CONTROL_DEFAULT_APL_HEADER_SUBTITLE'),
                controlId: control.id,
            },
            choices: {
                listItems: listOfChoices,
            },
            selections: {
                listItems: selectedChoices,
            },
        };
    }

    /**
     * The APL document to use when requesting a value
     *
     * Default: A TextListLayout document with scrollable and clickable list.
     * See
     * https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-alexa-text-list-layout.html
     */
    export function multiValueListDocumentGenerator(control: MultiValueListControl, input: ControlInput) {
        return {
            type: 'APL',
            version: '1.5',
            import: [
                {
                    name: 'alexa-layouts',
                    version: '1.2.0',
                },
            ],
            layouts: {},
            mainTemplate: {
                parameters: ['payload'],
                items: [
                    {
                        type: 'Container',
                        id: 'root',
                        bind: [
                            {
                                name: 'debugText',
                                type: 'string',
                                value: 'debug...',
                            },
                            {
                                name: 'showDebug',
                                type: 'boolean',
                                value: false,
                            },
                        ],
                        items: [
                            {
                                type: 'AlexaBackground',
                            },
                            {
                                type: 'AlexaHeader',
                                headerDivider: true,
                                headerTitle: '${payload.general.headerTitle}',
                                headerSubtitle: '${payload.general.headerSubtitle}',
                                height: '20vh',
                            },
                            {
                                type: 'AlexaButton',
                                buttonText: 'Done',
                                id: 'actionComplete',
                                primaryAction: {
                                    type: 'SendEvent',
                                    arguments: ['${payload.general.controlId}', 'Complete'],
                                },
                                right: '10vw',
                                position: 'absolute',
                            },
                            {
                                type: 'Text',
                                id: 'DebugText',
                                text: '${debugText}',
                                display: "${showDebug ? 'normal' : 'invisible'}",
                                position: 'absolute',
                                right: '0vw',
                            },
                            {
                                type: 'Container',
                                paddingLeft: '@spacingMedium',
                                direction: 'row',
                                items: [
                                    {
                                        type: 'AlexaTextList',
                                        width: '50vw',
                                        height: '80vh',
                                        touchForward: true,
                                        headerBackButton: false,
                                        primaryAction: {
                                            type: 'Sequential',
                                            commands: [
                                                {
                                                    type: 'SetValue',
                                                    componentId: 'root',
                                                    property: 'debugText',
                                                    value: '${ordinal}',
                                                },
                                                {
                                                    type: 'SendEvent',
                                                    arguments: [
                                                        '${payload.general.controlId}',
                                                        'Select',
                                                        '${ordinal}',
                                                    ],
                                                },
                                            ],
                                        },
                                        listItems: '${payload.choices.listItems}',
                                    },
                                    {
                                        type: 'AlexaTextList',
                                        touchForward: true,
                                        headerTitle: 'Your selections',
                                        headerSubtitle: 'Swipe to remove items',
                                        hideOrdinal: true,
                                        swipeDirection: 'left',
                                        swipeActionIconBackground: 'red',
                                        onSwipeDone: {
                                            type: 'Sequential',
                                            commands: [
                                                {
                                                    type: 'SetValue',
                                                    componentId: 'root',
                                                    property: 'debugText',
                                                    value: '${ordinal}',
                                                },
                                                {
                                                    type: 'SendEvent',
                                                    arguments: [
                                                        '${payload.general.controlId}',
                                                        'Remove',
                                                        '${ordinal}',
                                                    ],
                                                },
                                            ],
                                        },
                                        listItems: '${payload.selections.listItems}',
                                        theme: 'light',
                                        backgroundColor: 'white',
                                        width: '40vw',
                                        height: '90vh',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        };
    }
}
