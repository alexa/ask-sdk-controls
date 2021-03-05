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
import _ from 'lodash';
import { AplContent, ControlInput, ControlResponseBuilder } from '../..';
import { ListAPLComponentProps } from '../listControl/ListControl';
import { NumberControl, NumberControlAPLComponentProps } from './NumberControl';

export namespace NumberControlAPLComponentBuiltIns {
    export async function renderModalKeypad(
        control: NumberControl,
        props: NumberControlAPLComponentProps,
        input: ControlInput,
        resultBuilder: ControlResponseBuilder,
    ) {
        resultBuilder.addAPLDocumentStyle('NumberControlFrameStyle', {
            values: [
                {
                    borderWidth: 2,
                    borderStrokeWidth: 1,
                    borderColor: 'darkgrey',
                    hintColor: 'grey',
                    fontSize: '40dp',
                },
                {
                    when: '${state.focused}',
                    // borderColor: 'green',
                    borderStrokeWidth: 2,
                },
            ],
        });

        resultBuilder.addAPLDocumentLayout('ModalKeyPad', {
            parameters: [
                {
                    name: 'controlId',
                    type: 'string',
                },
                {
                    name: 'validationFailureMessage',
                    type: 'string',
                },
                {
                    name: 'inputNumber',
                    type: 'string',
                },
            ],
            items: [
                {
                    type: 'Container',
                    style: 'NumberControlFrameStyle',
                    width: '100%',
                    height: '100%',
                    items: [
                        {
                            type: 'Container',
                            width: '100%',
                            height: '100%',
                            direction: 'column',
                            items: [
                                {
                                    type: 'EditText',
                                    id: 'editTextNumber',
                                    style: 'EditStyle',
                                    keyboardType: 'numberPad',
                                    submitKeyType: 'go',
                                    onSubmit: [
                                        {
                                            type: 'Sequential',
                                            commands: [
                                                {
                                                    type: 'SendEvent',
                                                    arguments: ['${controlId}', '${event.source.value}'],
                                                },
                                            ],
                                        },
                                    ],
                                    accessibilityLabel: 'Enter a number',
                                    minWidth: '100%',
                                    maxWidth: '100%',
                                    grow: 1,
                                    validCharacters: '-0-9',
                                    text: '${inputNumber}',
                                    hint: '[number]',
                                    hintWeight: 'normal',
                                    fontSize: '34px',
                                },
                                {
                                    type: 'Text',
                                    text: '${validationFailureMessage}',
                                    minWidth: '100%',
                                    maxWidth: '100%',
                                    height: '30px',
                                    fontSize: '24px',
                                    color: 'red',
                                },
                            ],
                        },
                    ],
                },
            ],
        });

        const validationFailureMessage: string = await control.evaluateAPLValidationFailedMessage(
            props.validationFailedMessage!,
            input,
        );
        return {
            type: 'ModalKeyPad',
            controlId: control.id,
            inputNumber: control.state.value?.toString(),
            validationFailureMessage,
        };
    }

    /**
     * Defines ModalKeyPad Renderer for APLComponentMode.
     */
    export class ModalKeyPadRender {
        /**
         * Provides a default implementation of textList with default props.
         *
         * @param control - ListControl
         * @param defaultProps - props
         * @param input - Input
         * @param resultBuilder - Result builder
         */
        static default = async (
            control: NumberControl,
            defaultProps: NumberControlAPLComponentProps,
            input: ControlInput,
            resultBuilder: ControlResponseBuilder,
        ) => renderModalKeypad(control, defaultProps, input, resultBuilder);

        /**
         * Provides customization over `renderModalKeypad()` arguments where the input
         * props overrides the defaults.
         *
         * @param props - props
         */
        static of(props: ListAPLComponentProps) {
            return async (
                control: NumberControl,
                defaultProps: NumberControlAPLComponentProps,
                input: ControlInput,
                resultBuilder: ControlResponseBuilder,
            ) => {
                // Merges the user-provided props with the default props.
                // Any property defined by the user-provided data overrides the defaults.
                const mergedProps = _.merge(defaultProps, props);
                return renderModalKeypad(control, mergedProps, input, resultBuilder);
            };
        }
    }
}

export namespace NumberControlAPLPropsBuiltIns {
    export interface DefaultSelectValueAPLProps {
        /**
         * Default: 'Please select'
         */
        title?: string;
        /**
         * Tracks the text to be displayed for invalid input values
         * when control renders APL in Component Mode.
         */
        validationFailedMessage?: string | ((value?: number) => string);
        /**
         * Function that maps the NumberControlState.value to rendered value that
         * will be presented to the user as a list.
         *
         * Default: returns the value unchanged in string format.
         */
        valueRenderer?: (value: number, input: ControlInput) => string;
    }

    export function defaultSelectValueAPLContent(
        props: DefaultSelectValueAPLProps,
    ): (control: NumberControl, input: ControlInput) => AplContent | Promise<AplContent> {
        return async (control: NumberControl, input: ControlInput) => {
            const aplContent = {
                document: numberPadDocumentGenerator(),
                dataSource: await numberPadDataSourceGenerator(control, input, props),
            };
            return aplContent;
        };
    }

    /**
     * The APL dataSource to use when requesting a number value.
     *
     */
    export async function numberPadDataSourceGenerator(
        control: NumberControl,
        input: ControlInput,
        contentProps: DefaultSelectValueAPLProps,
    ) {
        return {
            numPadData: {
                controlId: control.id,
                headerTitle: i18next.t('NUMBER_CONTROL_DEFAULT_APL_HEADER_TITLE'),
                validationFailedMessage: await control.evaluateAPLValidationFailedMessage(
                    contentProps.validationFailedMessage!,
                    input,
                ),
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

export type NumberControlAPLComponentStyle = 'modalKeypad';
