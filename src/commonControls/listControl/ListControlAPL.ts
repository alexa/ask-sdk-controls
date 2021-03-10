import i18next from 'i18next';
import { ControlResponseBuilder } from '../..';
import { ControlInput } from '../../controls/ControlInput';
import { AplContent, ListAPLComponentProps, ListControl, ListControlRenderedItem } from './ListControl';

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
export namespace ListControlAPLPropsBuiltIns {
    export interface DefaultSelectValueAPLProps {
        /**
         * Default: 'Please select'
         */
        title?: string;

        /**
         * Default: ''
         */
        subtitle?: string;

        /**
         * Function that maps the ListControlState.value to rendered value that
         * will be presented to the user as a list.
         *
         * Default: returns the value unchanged.
         */
        valueRenderer: (value: string, input: ControlInput) => ListControlRenderedItem;
    }

    export function defaultSelectValueAPLContent(
        props: DefaultSelectValueAPLProps,
    ): (control: ListControl, input: ControlInput) => AplContent {
        return (control: ListControl, input: ControlInput) => {
            return {
                document: listDocumentGenerator(control, input),
                dataSource: listDataSourceGenerator(control, input, props),
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
    export function listDataSourceGenerator(
        control: ListControl,
        input: ControlInput,
        contentProps: DefaultSelectValueAPLProps,
    ) {
        const listOfChoices = [];
        const choices = control.getChoicesList(input);
        for (const item of choices) {
            listOfChoices.push({
                primaryText: contentProps.valueRenderer(item, input).primaryText!,
            });
        }
        return {
            general: {
                headerTitle: contentProps.title ?? i18next.t('LIST_CONTROL_DEFAULT_APL_HEADER_TITLE'),
                headerSubtitle: contentProps.subtitle ?? '',
                controlId: control.id,
            },
            choices: {
                listItems: listOfChoices,
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
    export function listDocumentGenerator(control: ListControl, input: ControlInput) {
        return {
            type: 'APL',
            version: '1.3',
            import: [
                {
                    name: 'alexa-layouts',
                    version: '1.1.0',
                },
            ],
            mainTemplate: {
                parameters: ['payload'],
                items: [
                    {
                        type: 'AlexaTextList',
                        theme: '${viewport.theme}',
                        headerTitle: '${payload.general.headerTitle}',
                        headerDivider: true,
                        backgroundColor: 'transparent',
                        touchForward: true,
                        primaryAction: {
                            type: 'SendEvent',
                            arguments: ['${payload.general.controlId}', '${ordinal}'],
                        },
                        listItems: '${payload.choices.listItems}',
                    },
                ],
            },
        };
    }
}

export type ListStyles = 'textList' | 'imageList';

export namespace ListControlComponentAPLBuiltIns {
    export function renderComponent(
        control: ListControl,
        props: ListAPLComponentProps,
        input: ControlInput,
        resultBuilder: ControlResponseBuilder,
    ) {
        if (props.renderStyle === 'textList') {
            return renderTextList(control, props, input, resultBuilder);
        } else if (props.renderStyle === 'imageList') {
            return renderImageList(control, props, input, resultBuilder);
        } else {
            throw new Error('Invalid render style');
        }
    }

    export function renderImageList(
        control: ListControl,
        props: ListAPLComponentProps,
        input: ControlInput,
        resultBuilder: ControlResponseBuilder,
    ) {
        // TODO: Offer customization of where the image is placed, highlight colors, etc
        resultBuilder.addAPLDocumentLayout('ImageListSelector', {
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
                    type: 'Container',
                    width: '100%',
                    height: '100%',
                    paddingLeft: '20px',
                    item: {
                        type: 'Sequence',
                        data: '${listItems}',
                        width: '100%',
                        height: '100%',
                        numbered: true,
                        items: [
                            {
                                type: 'TouchWrapper',
                                width: '100%',
                                height: '170px',
                                onPress: [
                                    {
                                        type: 'Sequential',
                                        commands: [
                                            {
                                                type: 'SendEvent',
                                                arguments: ['${controlId}', '${ordinal}'],
                                            },
                                            {
                                                type: 'SetValue',
                                                componentId: 'root',
                                                property: 'disableScreen',
                                                value: true,
                                            },
                                        ],
                                    },
                                ],
                                item: {
                                    type: 'Container',
                                    width: '100%',
                                    height: '100%',
                                    direction: 'column',
                                    items: [
                                        {
                                            type: 'Text',
                                            id: 'paddingPlaceholder',
                                            height: '20px',
                                            text: '',
                                        },
                                        {
                                            type: 'Frame',
                                            backgroundColor: '${data.backgroundColor}',
                                            item: {
                                                type: 'Container',
                                                width: '100%',
                                                height: '100%',
                                                direction: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                items: [
                                                    {
                                                        width: '70%',
                                                        height: '100%',
                                                        type: 'Container',
                                                        direction: 'column',
                                                        justifyContent: 'center',
                                                        items: [
                                                            {
                                                                type: 'Text',
                                                                text: '${data.primaryText}',
                                                                fontSize: '@fontSizeSmall',
                                                                color: '${data.fontColor}',
                                                            },
                                                            {
                                                                type: 'Text',
                                                                text: '${data.secondaryText}',
                                                                fontSize: '@fontSizeXSmall',
                                                                color: '${data.fontColor}',
                                                            },
                                                        ],
                                                    },
                                                    {
                                                        type: 'Container',
                                                        direction: 'column',
                                                        width: '30%',
                                                        height: '100%',
                                                        items: [
                                                            {
                                                                type: 'Image',
                                                                borderRadius: '90',
                                                                width: '150px',
                                                                height: '150px',
                                                                source: '${data.imageSource}',
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            ],
        });

        const itemIds: string[] = control.getListItemIDs(input);
        // Create the inline document, which instantiates the Layout
        const listItems = itemIds.map((item) => {
            const renderedItem: ListControlRenderedItem = props.valueRenderer!(item, input);
            return {
                primaryText: renderedItem.primaryText,
                secondaryText: renderedItem.secondaryText ?? '',
                imageSource: renderedItem.imageSource ?? 'Invalid Image Source',
                fontColor:
                    props.highlightSelected !== undefined && props.highlightSelected
                        ? control.state.value === item
                            ? 'white'
                            : '#777777'
                        : 'white',
                backgroundColor:
                    props.highlightSelected !== undefined && props.highlightSelected
                        ? control.state.value === item
                            ? 'blue'
                            : '#222222'
                        : '#222222',
            };
        });

        return {
            type: 'ImageListSelector',
            controlId: control.id,
            listItems,
        };
    }

    export function renderTextList(
        control: ListControl,
        props: ListAPLComponentProps,
        input: ControlInput,
        resultBuilder: ControlResponseBuilder,
    ) {
        resultBuilder.addAPLDocumentLayout('TextListSelector', {
            parameters: [
                {
                    name: 'controlId',
                    type: 'string',
                },
                {
                    name: 'listItems',
                    type: 'array',
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
                                    type: 'AlexaTextListItem',
                                    touchForward: true,
                                    hideOrdinal: false,
                                    disabled: '${disableScreen}',
                                    primaryText: '${data.primaryText}',
                                    primaryAction: {
                                        type: 'Sequential',
                                        commands: [
                                            {
                                                type: 'SendEvent',
                                                arguments: ['${controlId}', '${ordinal}'],
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
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        const itemIds: string[] = control.getListItemIDs(input);
        // Create the inline document, which instantiates the Layout
        const listItems = itemIds.map((x) => ({
            primaryText: props.valueRenderer!(x, input).primaryText,
        }));

        return {
            type: 'TextListSelector',
            controlId: control.id,
            listItems,
        };
    }
}
