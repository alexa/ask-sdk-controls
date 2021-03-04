import i18next from 'i18next';
import { ControlResponseBuilder } from '../..';
import { ControlInput } from '../../controls/ControlInput';
import { assert } from '../../utils/AssertionUtils';
import { AplContent, MultiValueListAPLComponentProps, MultiValueListControl } from './MultiValueListControl';

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
    export interface DefaultSelectValueAPLProps {
        /**
         * Default: 'Create your list'
         */
        title?: string;

        /**
         * Default (en-*): 'Done;'
         */
        submitButtonText?: string;

        /**
         * Default: 'Say an item or touch it to add it your list'
         */
        subtitle?: string;

        /**
         * Default: 'YOUR SELECTIONS'
         */
        selectionListTitle?: string;

        /**
         * Default: 'Swipe left to remove items'
         */
        selectionListSubtitle?: string;
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

    export function defaultSelectValueAPLContent(
        props: DefaultSelectValueAPLProps,
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
        contentProps: DefaultSelectValueAPLProps,
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
                headerSubtitle:
                    contentProps.subtitle ?? i18next.t('MULTIVALUELIST_CONTROL_DEFAULT_APL_HEADER_SUBTITLE'),
                selectionListTitle:
                    contentProps.selectionListTitle ??
                    i18next.t('MULTIVALUELIST_CONTROL_DEFAULT_APL_SELECTION_TITLE'),
                selectionListSubtitle:
                    contentProps.selectionListSubtitle ??
                    i18next.t('MULTIVALUELIST_CONTROL_DEFAULT_APL_SELECTION_SUBTITLE'),
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
     * The APL document to use when selecting a value
     *
     * Default: A dual-TextListLayout document one with scrollable and clickable list and another with swipeAction to remove items from list.
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
                        width: '100%',
                        id: 'root',
                        bind: [
                            {
                                name: 'debugText',
                                type: 'string',
                                value: 'debugValue',
                            },
                            {
                                name: 'disableScreen',
                                type: 'boolean',
                                value: false,
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
                                    type: 'Sequential',
                                    commands: [
                                        {
                                            type: 'SendEvent',
                                            arguments: ['${payload.general.controlId}', 'Complete'],
                                        },
                                        {
                                            type: 'SetValue',
                                            componentId: 'root',
                                            property: 'disableScreen',
                                            value: true,
                                        },
                                        {
                                            type: 'SetValue',
                                            componentId: 'root',
                                            property: 'debugText',
                                            value: 'Done Selected',
                                        },
                                    ],
                                },
                                right: '@marginHorizontal',
                                top: "${@viewportProfile == @hubLandscapeSmall ? '1vw' : '2vw'}",
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
                                paddingRight: '@marginHorizontal',
                                paddingTop: '@spacingSmall',
                                direction: 'row',
                                width: '100%',
                                shrink: 1,
                                items: [
                                    {
                                        type: 'Container',
                                        width: '55%',
                                        height: '80vh',
                                        items: [
                                            {
                                                type: 'Sequence',
                                                scrollDirection: 'vertical',
                                                data: '${payload.choices.listItems}',
                                                width: '100%',
                                                paddingLeft: '0',
                                                numbered: true,
                                                grow: 1,
                                                items: [
                                                    {
                                                        type: 'Container',
                                                        items: [
                                                            {
                                                                type: 'AlexaTextListItem',
                                                                touchForward: true,
                                                                disabled: '${disableScreen}',
                                                                primaryText: '${data.primaryText}',
                                                                primaryAction: {
                                                                    type: 'Sequential',
                                                                    commands: [
                                                                        {
                                                                            type: 'SendEvent',
                                                                            arguments: [
                                                                                '${payload.general.controlId}',
                                                                                'Select',
                                                                                '${ordinal}',
                                                                            ],
                                                                        },
                                                                        {
                                                                            type: 'SetValue',
                                                                            componentId: 'root',
                                                                            property: 'disableScreen',
                                                                            value: true,
                                                                        },
                                                                        {
                                                                            type: 'SetValue',
                                                                            componentId: 'root',
                                                                            property: 'debugText',
                                                                            value: 'selected ${ordinal}',
                                                                        },
                                                                    ],
                                                                },
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: 'Container',
                                        width: '55%',
                                        height: '80vh',
                                        items: [
                                            {
                                                type: 'AlexaBackground',
                                                backgroundColor: 'white',
                                            },
                                            {
                                                type: 'Text',
                                                style: 'textStyleMetadata',
                                                color: 'black',
                                                textAlign: 'center',
                                                textAlignVertical: 'center',
                                                maxLines: 1,
                                                paddingTop: '@spacingXSmall',
                                                text: '${payload.general.selectionListTitle}',
                                            },
                                            {
                                                type: 'Text',
                                                style: 'textStyleMetadataAlt',
                                                color: 'black',
                                                textAlign: 'center',
                                                textAlignVertical: 'center',
                                                maxLines: 1,
                                                text: '${payload.general.selectionListSubtitle}',
                                            },
                                            {
                                                type: 'Sequence',
                                                scrollDirection: 'vertical',
                                                data: '${payload.selections.listItems}',
                                                width: '100%',
                                                paddingLeft: '0',
                                                numbered: true,
                                                grow: 1,
                                                items: [
                                                    {
                                                        type: 'Container',
                                                        items: [
                                                            {
                                                                type: 'AlexaSwipeToAction',
                                                                touchForward: true,
                                                                hideOrdinal: true,
                                                                theme: 'light',
                                                                actionIconType: 'AVG',
                                                                actionIcon: 'cancel',
                                                                actionIconBackground: 'red',
                                                                disabled: '${disableScreen}',
                                                                primaryText: '${data.primaryText}',
                                                                onSwipeDone: {
                                                                    type: 'Sequential',
                                                                    commands: [
                                                                        {
                                                                            type: 'SendEvent',
                                                                            arguments: [
                                                                                '${payload.general.controlId}',
                                                                                'Remove',
                                                                                '${ordinal}',
                                                                            ],
                                                                        },
                                                                        {
                                                                            type: 'SetValue',
                                                                            componentId: 'root',
                                                                            property: 'disableScreen',
                                                                            value: true,
                                                                        },
                                                                        {
                                                                            type: 'SetValue',
                                                                            componentId: 'root',
                                                                            property: 'debugText',
                                                                            value: 'removed ${ordinal}',
                                                                        },
                                                                    ],
                                                                },
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            graphics: {
                cancel: {
                    type: 'AVG',
                    version: '1.0',
                    width: 24,
                    height: 24,
                    parameters: ['fillColor'],
                    items: [
                        {
                            type: 'path',
                            fill: '${fillColor}',
                            pathData:
                                'M19.07 17.66L13.41 12l5.66-5.66C19.41 5.94 19.39 5.35 19.02 4.98 18.65 4.61 18.06 4.59 17.66 4.93L12 10.59 6.34 4.93C5.94 4.59 5.35 4.61 4.98 4.98 4.61 5.35 4.59 5.94 4.93 6.34L10.59 12l-5.66 5.66C4.64 17.9 4.52 18.29 4.61 18.65 4.7 19.02 4.98 19.3 5.35 19.39 5.71 19.48 6.1 19.36 6.34 19.07L12 13.41l5.66 5.66C18.06 19.41 18.65 19.39 19.02 19.02 19.39 18.65 19.41 18.06 19.07 17.66z',
                        },
                    ],
                },
            },
        };
    }
}

export type MultiValueListStyles = 'checkBoxes' | 'dualList' | 'aggregateDuplicates';

export namespace MultiValueListControlComponentAPLBuiltIns {
    export function renderComponent(
        control: MultiValueListControl,
        props: MultiValueListAPLComponentProps,
        input: ControlInput,
        resultBuilder: ControlResponseBuilder,
    ) {
        assert(props.valueRenderer !== undefined);
        if (props.renderStyle === 'checkBoxes') {
            resultBuilder.addAPLDocumentLayout('MultiValueListSelector', {
                parameters: [
                    {
                        name: 'controlId',
                        type: 'string',
                    },
                    {
                        name: 'listItems',
                        type: 'object',
                    },
                ],
                items: [
                    {
                        type: 'Sequence',
                        scrollDirection: 'vertical',
                        data: '${listItems}',
                        width: '100%',
                        height: '100%',
                        paddingLeft: '0',
                        numbered: true,
                        items: [
                            {
                                type: 'Container',
                                items: [
                                    {
                                        type: 'TouchWrapper',
                                        disabled: '${disabled}',
                                        item: {
                                            type: 'Container',
                                            direction: 'row',
                                            items: [
                                                {
                                                    type: 'Text',
                                                    paddingLeft: '32px',
                                                    style: 'textStyleBody',
                                                    text: '${data.primaryText}',
                                                    textAlignVertical: 'center',
                                                    grow: 1,
                                                },
                                                {
                                                    type: 'AlexaCheckbox',
                                                    id: '${checkboxId}',
                                                    checkboxHeight: '64px',
                                                    checkboxWidth: '64px',
                                                    selectedColor: '${selectedColor}',
                                                    checked: '${data.checked}',
                                                    disabled: '${disabled}',
                                                    onPress: [
                                                        {
                                                            type: 'Sequential',
                                                            commands: [
                                                                {
                                                                    type: 'SendEvent',
                                                                    arguments: [
                                                                        '${controlId}',
                                                                        'Toggle',
                                                                        '${ordinal}',
                                                                    ],
                                                                },
                                                                {
                                                                    type: 'SetValue',
                                                                    componentId: 'root',
                                                                    property: 'disableScreen',
                                                                    value: true,
                                                                },
                                                                {
                                                                    type: 'SetValue',
                                                                    componentId: 'root',
                                                                    property: 'debugText',
                                                                    value: 'Selected ${ordinal}',
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                        onPress: [
                                            {
                                                type: 'Sequential',
                                                commands: [
                                                    {
                                                        type: 'SendEvent',
                                                        arguments: ['${controlId}', 'Toggle', '${ordinal}'],
                                                    },
                                                    {
                                                        type: 'SetValue',
                                                        componentId: 'root',
                                                        property: 'disableScreen',
                                                        value: true,
                                                    },
                                                    {
                                                        type: 'SetValue',
                                                        componentId: 'root',
                                                        property: 'debugText',
                                                        value: 'Selected ${ordinal}',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            const listItems: Array<{
                primaryText: string;
                checked: boolean;
            }> = [];
            const choices = control.getChoicesList(input);
            for (const item of choices) {
                listItems.push({
                    primaryText: props.valueRenderer([item], input)[0],
                    checked: control.getSlotIds().includes(item),
                });
            }
            return {
                type: 'MultiValueListSelector',
                controlId: control.id,
                listItems,
            };
        } else if (props.renderStyle === 'dualList') {
            resultBuilder.addAPLDocumentLayout('MultiValueListSelector', {
                parameters: [
                    {
                        name: 'controlId',
                        type: 'string',
                    },
                    {
                        name: 'payload',
                        type: 'object',
                    },
                ],
                items: [
                    {
                        type: 'Container',
                        direction: 'row',
                        width: '100%',
                        height: '100%',
                        items: [
                            {
                                type: 'Container',
                                width: '50%',
                                items: [
                                    {
                                        type: 'Sequence',
                                        data: '${payload.choices.listItems}',
                                        numbered: true,
                                        grow: 1,
                                        paddingLeft: '10px',
                                        items: [
                                            {
                                                type: 'AlexaTextListItem',
                                                hideHorizontalMargin: true,
                                                primaryText: '${data.primaryText}',
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
                                                touchForward: true,
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                type: 'Container',
                                width: '50%',
                                items: [
                                    {
                                        type: 'AlexaBackground',
                                        backgroundColor: 'white',
                                    },
                                    {
                                        type: 'Text',
                                        style: 'textStyleMetadata',
                                        color: 'black',
                                        textAlign: 'center',
                                        textAlignVertical: 'center',
                                        maxLines: 1,
                                        paddingTop: '@spacingXSmall',
                                        text: '${payload.general.selectionListTitle}',
                                    },
                                    {
                                        type: 'Text',
                                        style: 'textStyleMetadataAlt',
                                        color: 'black',
                                        textAlign: 'center',
                                        textAlignVertical: 'center',
                                        maxLines: 1,
                                        text: '${payload.general.selectionListSubtitle}',
                                    },
                                    {
                                        type: 'Sequence',
                                        scrollDirection: 'vertical',
                                        data: '${payload.selections.listItems}',
                                        numbered: true,
                                        grow: 1,
                                        items: [
                                            {
                                                type: 'Container',
                                                items: [
                                                    {
                                                        type: 'AlexaSwipeToAction',
                                                        touchForward: true,
                                                        hideOrdinal: true,
                                                        theme: 'light',
                                                        actionIconType: 'AVG',
                                                        actionIcon: 'cancel',
                                                        actionIconBackground: 'red',
                                                        primaryText: '${data.primaryText}',
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
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
            const listOfChoices = [];
            const selectedChoices = [];

            const choices = control.getChoicesList(input);
            for (const item of choices) {
                listOfChoices.push({
                    primaryText: props.valueRenderer([item], input)[0],
                });
            }

            const selections = control.getSlotIds();
            for (const item of selections) {
                selectedChoices.push({
                    primaryText: props.valueRenderer([item], input)[0],
                });
            }

            const payload = {
                general: {
                    headerTitle: i18next.t('MULTIVALUELIST_CONTROL_DEFAULT_APL_HEADER_TITLE'),
                    headerSubtitle: i18next.t('MULTIVALUELIST_CONTROL_DEFAULT_APL_HEADER_SUBTITLE'),
                    selectionListTitle: i18next.t('MULTIVALUELIST_CONTROL_DEFAULT_APL_SELECTION_TITLE'),
                    selectionListSubtitle: i18next.t('MULTIVALUELIST_CONTROL_DEFAULT_APL_SELECTION_SUBTITLE'),
                    controlId: control.id,
                },
                choices: {
                    listItems: listOfChoices,
                },
                selections: {
                    listItems: selectedChoices,
                },
            };

            return {
                type: 'MultiValueListSelector',
                controlId: control.id,
                payload,
            };
        } else if (props.renderStyle === 'aggregateDuplicates') {
            resultBuilder.addAPLDocumentLayout('MultiValueListSelector', {
                parameters: [
                    {
                        name: 'controlId',
                        type: 'string',
                    },
                    {
                        name: 'listItems',
                        type: 'object',
                    },
                ],
                items: [
                    {
                        type: 'Sequence',
                        id: 'root',
                        scrollDirection: 'vertical',
                        data: '${listItems}',
                        width: '100%',
                        height: '100%',
                        paddingLeft: '0',
                        numbered: true,
                        bind: [
                            {
                                name: 'disableContent',
                                value: false,
                                type: 'boolean',
                            },
                        ],
                        items: [
                            {
                                type: 'Container',
                                items: [
                                    {
                                        type: 'TouchWrapper',
                                        disabled: '${disabled}',
                                        item: {
                                            type: 'Container',
                                            direction: 'row',
                                            items: [
                                                {
                                                    type: 'Text',
                                                    paddingLeft: '32px',
                                                    style: 'textStyleBody',
                                                    text: '${data.primaryText}',
                                                    textAlignVertical: 'center',
                                                    grow: 1,
                                                },
                                                {
                                                    type: 'Text',
                                                    paddingTop: '12px',
                                                    id: 'counter-${ordinal}',
                                                    textAlign: 'center',
                                                    text: '${data.value}',
                                                },
                                                {
                                                    type: 'AlexaIconButton',
                                                    buttonSize: '72dp',
                                                    disabled: '${disableContent}',
                                                    vectorSource:
                                                        'M21 11h-8V3C13 2.45 12.55 2 12 2 11.45 2 11 2.45 11 3v8H3C2.45 11 2 11.45 2 12 2 12.55 2.45 13 3 13h8v8C11 21.55 11.45 22 12 22 12.55 22 13 21.55 13 21v-8h8C21.55 13 22 12.55 22 12 22 11.45 21.55 11 21 11z',
                                                    primaryAction: {
                                                        type: 'Sequential',
                                                        commands: [
                                                            {
                                                                type: 'SetValue',
                                                                property: 'disableContent',
                                                                value: true,
                                                            },
                                                            {
                                                                type: 'SendEvent',
                                                                arguments: [
                                                                    '${controlId}',
                                                                    'Select',
                                                                    '${ordinal}',
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                },
                                                {
                                                    type: 'AlexaIconButton',
                                                    buttonSize: '72dp',
                                                    disabled: '${data.value <=0 || disableContent}',
                                                    vectorSource:
                                                        'M21 13H3C2.45 13 2 12.55 2 12 2 11.45 2.45 11 3 11h18C21.55 11 22 11.45 22 12 22 12.55 21.55 13 21 13z',
                                                    primaryAction: {
                                                        type: 'Sequential',
                                                        commands: [
                                                            {
                                                                type: 'SetValue',
                                                                property: 'disableContent',
                                                                value: true,
                                                            },
                                                            {
                                                                type: 'SendEvent',
                                                                arguments: [
                                                                    '${controlId}',
                                                                    'Reduce',
                                                                    '${ordinal}',
                                                                ],
                                                            },
                                                        ],
                                                    },
                                                },
                                            ],
                                        },
                                        onPress: [
                                            {
                                                type: 'Sequential',
                                                commands: [
                                                    {
                                                        type: 'SetValue',
                                                        property: 'disableContent',
                                                        value: true,
                                                    },
                                                    {
                                                        type: 'SendEvent',
                                                        arguments: ['${controlId}', 'Select', '${ordinal}'],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            const listItems: Array<{
                primaryText: string;
                value: number;
            }> = [];
            const aggregateValues: { [key: string]: any } = {};
            const selections = control.getSlotIds();

            selections.forEach((x) => {
                aggregateValues[x] = (aggregateValues[x] ?? 0) + 1;
            });

            const choices = control.getChoicesList(input);
            for (const item of choices) {
                listItems.push({
                    primaryText: props.valueRenderer([item], input)[0],
                    value: aggregateValues[item] ?? 0,
                });
            }
            return {
                type: 'MultiValueListSelector',
                controlId: control.id,
                listItems,
            };
        } else {
            throw Error('Invalid renderStyle');
        }
    }
}
