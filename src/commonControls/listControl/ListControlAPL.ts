import i18next from 'i18next';
import { RequestChangedValueByListAct } from '../..';

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
    /*
     * For information about the TextListTemplate, see following doc:
     * https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-alexa-text-list-layout.html
     */
    export const TextList = {
        enabled: true,
        requestValue: {
            document: TextListDocumentGenerator(),
            dataSource: TextListDataSourceGenerator((choiceId) => choiceId),
            customHandlingFuncs: [],
        },
        requestChangedValue: {
            document: TextListDocumentGenerator(),
            dataSource: TextListDataSourceGenerator((choiceId) => choiceId),
            customHandlingFuncs: [],
        },
    };

    /**
     * The APL dataSource to use when requesting a value
     *
     * Default: A TextListLayout data source to bind to an APL document.
     * See
     * https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-data-source.html
     */
    export function TextListDataSourceGenerator(
        slotIdMapper: { [index: string]: string } | ((choiceId: string) => string),
    ) {
        return (act: RequestChangedValueByListAct) => {
            const itemsArray: APLListItem[] = [];
            for (const choice of (act as any).payload.allChoices) {
                itemsArray.push({
                    primaryText:
                        typeof slotIdMapper === 'function' ? slotIdMapper(choice) : slotIdMapper[choice],
                });
            }

            return {
                textListData: {
                    controlId: act.control.id,
                    headerTitle: i18next.t('LIST_CONTROL_DEFAULT_APL_HEADER_TITLE'),
                    items: itemsArray,
                },
            };
        };
    }

    /**
     * The APL document to use when requesting a value
     *
     * Default: A TextListLayout document with scrollable and clickable list.
     * See
     * https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-alexa-text-list-layout.html
     */
    export function TextListDocumentGenerator() {
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
                parameters: ['textListData'],
                items: [
                    {
                        type: 'AlexaTextList',
                        theme: '${viewport.theme}',
                        headerTitle: '${textListData.headerTitle}',
                        headerDivider: true,
                        headerBackButton: false,
                        headerBackButtonAccessibilityLabel: 'back',
                        headerBackgroundColor: 'transparent',
                        backgroundColor: 'transparent',
                        backgroundScale: 'best-fill',
                        backgroundAlign: 'center',
                        backgroundBlur: false,
                        hideOrdinal: false,
                        primaryAction: {
                            type: 'SendEvent',
                            arguments: ['${textListData.controlId}', '${ordinal}'],
                        },
                        listItems: '${textListData.items}',
                    },
                ],
            },
        };
    }
}
