import i18next from 'i18next';
import { ControlInput } from '../../controls/ControlInput';
import { AplContent, ListControl } from './ListControl';

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

interface APLListItem {
    primaryText: string;
}

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
        valueRenderer: (value: string, input: ControlInput) => string;
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
                primaryText: contentProps.valueRenderer(item, input),
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
