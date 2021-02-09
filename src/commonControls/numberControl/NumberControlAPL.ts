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
import { ControlInput } from '../..';
import { NumberControl } from './NumberControl';

export namespace NumberControlAPLPropsBuiltIns {
    /*
     * Default NumberControl APL props
     */
    export function createDefault() {
        return {
            enabled: true,
            validationFailedMessage: (value?: number | string) =>
                i18next.t('NUMBER_CONTROL_DEFAULT_APL_INVALID_VALUE', {
                    value,
                }),
            requestValue: (control: NumberControl, input: ControlInput, validationFailedMessage: string) => {
                const aplContent = {
                    document: numberPadDocumentGenerator(),
                    dataSource: numberPadDataSourceGenerator(control, input, validationFailedMessage),
                    customHandlingFuncs: [],
                };
                return aplContent;
            },
            requestChangedValue: (
                control: NumberControl,
                input: ControlInput,
                validationFailedMessage: string,
            ) => {
                const aplContent = {
                    document: numberPadDocumentGenerator(),
                    dataSource: numberPadDataSourceGenerator(control, input, validationFailedMessage),
                    customHandlingFuncs: [],
                };
                return aplContent;
            },
            title: '[title]',
        };
    }

    /**
     * The APL dataSource to use when requesting a number value.
     *
     */
    export function numberPadDataSourceGenerator(
        control: NumberControl,
        input: ControlInput,
        validationFailedMessage: string,
    ) {
        return {
            numPadData: {
                controlId: control.id,
                headerTitle: i18next.t('NUMBER_CONTROL_DEFAULT_APL_HEADER_TITLE'),
                isValidValue: control.state.isValidValue,
                validationFailedMessage,
            },
        };
    }

    /**
     * The APL document to use when requesting a number value.
     * For information on EditText, see:
     * https://developer.amazon.com/en-US/docs/alexa/alexa-presentation-language/apl-edittext.html
     *
     */
    export function numberPadDocumentGenerator() {
        return {
            type: 'APL',
            version: '1.4',
            import: [
                {
                    name: 'alexa-layouts',
                    version: '1.2.0',
                },
            ],
            styles: {
                EditStyle: {
                    values: [
                        {
                            borderWidth: 2,
                            borderStrokeWidth: 1,
                            borderColor: 'darkgrey',
                            hintColor: 'grey',
                            fontSize: '20dp',
                        },
                        {
                            when: '${state.focused}',
                            borderColor: 'green',
                            borderStrokeWidth: 2,
                        },
                    ],
                },
            },
            mainTemplate: {
                parameters: ['numPadData'],
                items: {
                    type: 'Container',
                    width: '100vw',
                    height: '100vh',
                    direction: 'column',
                    items: [
                        {
                            type: 'AlexaBackground',
                        },
                        {
                            type: 'AlexaHeader',
                            headerTitle: '${numPadData.headerTitle}',
                            headerDivider: true,
                        },
                        {
                            type: 'Container',
                            alignItems: 'center',
                            justifyContent: 'center',
                            grow: 1,
                            items: [
                                {
                                    type: 'EditText',
                                    id: 'editTextNumber',
                                    style: 'EditStyle',
                                    keyboardType: 'numberPad',
                                    submitKeyType: 'go',
                                    bind: [
                                        {
                                            name: 'NumberValue',
                                            value: '${NumberValue}',
                                            type: 'number',
                                        },
                                    ],
                                    onSubmit: [
                                        {
                                            type: 'Sequential',
                                            commands: [
                                                {
                                                    type: 'SendEvent',
                                                    arguments: [
                                                        '${numPadData.controlId}',
                                                        '${event.source.value}',
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                    accessibilityLabel: 'Enter a number',
                                    width: '50vw',
                                    validCharacters: '-0-9',
                                    hint: 'Enter a number',
                                    hintWeight: 'normal',
                                    fontSize: '5vh',
                                },
                                {
                                    type: 'Text',
                                    when: '${numPadData.isValidValue == false}',
                                    width: '50vw',
                                    spacing: '2vh',
                                    text: '${numPadData.validationFailedMessage}',
                                    textAlign: 'center',
                                    fontSize: '5vh',
                                    color: 'red',
                                },
                            ],
                        },
                    ],
                },
            },
        };
    }
}
