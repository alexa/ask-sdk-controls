import i18next from 'i18next';
import { RequestValueAct, RequestChangedValueAct } from '../..';
import { Control, ControlState } from '../../controls/Control';
import { ControlInput } from '../../controls/ControlInput';
import { DeepRequired } from '../../utils/DeepRequired';
import { NumberControl, NumberControlAPLProps, NumberControlState } from './NumberControl';

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

export namespace NumberControlAPLPropsBuiltIns {
    /*
     * Default NumberControl APL props
     */
    export const Default: DeepRequired<NumberControlAPLProps> = {
        enabled: true,
        validationFailedMessage: i18next.t('NUMBER_CONTROL_DEFAULT_REPROMPT_GENERAL_INVALID_VALUE'),
        requestValue: {
            document: numberPadDocumentGenerator(),
            dataSource: numberPadDataSourceGenerator(),
            customHandlingFuncs: [],
        },
        requestChangedValue: {
            document: numberPadDocumentGenerator(),
            dataSource: numberPadDataSourceGenerator(),
            customHandlingFuncs: [],
        },
    };

    /**
     * The APL dataSource to use when requesting a number value
     *
     */
    export function numberPadDataSourceGenerator() {
        return (act: RequestValueAct | RequestChangedValueAct) => {
            return {
                numPadData: {
                    controlId: act.control.id,
                    headerTitle: i18next.t('NUMBER_CONTROL_DEFAULT_APL_HEADER_TITLE'),
                    isValidValue: (act.control as NumberControl).state.isValidValue,
                    validationFailedMessage: (act.control as NumberControl).getAplValidationFailedMessage(),
                },
            };
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
                            hintWeight: '200',
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
                            theme: 'dark',
                        },
                        {
                            type: 'Container',
                            height: '75%',
                            alignItems: 'center',
                            justifyContent: 'center',
                            items: [
                                {
                                    type: 'EditText',
                                    when: '${environment.aplVersion != null}',
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
