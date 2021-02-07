import { SkillBuilders } from 'ask-sdk-core';
import { Control } from '../../..//src/controls/Control';
import { ControlInput, ControlResponseBuilder, ControlResult, InputUtil, NumberControl } from '../../../src';
import { ControlManager } from '../../../src/controls/ControlManager';
import { APLRenderContext } from '../../../src/responseGeneration/APLRenderContext';
import { ControlHandler } from '../../../src/runtime/ControlHandler';
import { DemoRootControl } from '../../Common/src/DemoRootControl';

export namespace SinglePageApp {
    export class DemoControlManager extends ControlManager {
        ageControl: NumberControl;
        guestsControl: NumberControl;

        createControlTree(): Control {
            const rootControl = new DemoRootControl({ id: 'root' });

            rootControl.addChild(
                (this.ageControl = new NumberControl({
                    id: 'age',
                    interactionModel: {
                        targets: ['builtin_it', 'age'],
                    },
                    prompts: {
                        requestValue: 'How old will you be?',
                        valueSet: (act, input) => `${act.payload.renderedValue} is a great age!`,
                    },
                })),
            );

            rootControl.addChild(
                (this.guestsControl = new NumberControl({
                    id: 'guests',
                    interactionModel: {
                        targets: ['builtin_it', 'guests'],
                    },
                    validation: (state) =>
                        state.value <= 10 || { renderedReason: 'Ten guests is the most we can accommodate.' },
                    prompts: {
                        requestValue: 'How many guests are coming?',
                        valueSet: (act, input) =>
                            `${act.payload.value > 3 ? 'Awesome' : 'OK'}. I have you down for ${
                                act.payload.renderedValue
                            } guests.`,
                    },
                    apl: {
                        validationFailedMessage: 'Maximum: 10',
                    },
                })),
            );

            return rootControl;
        }

        async renderApplicationAPL(
            result: ControlResult,
            input: ControlInput,
            controlResponseBuilder: ControlResponseBuilder,
        ): Promise<void> {
            const aplRenderContext = new APLRenderContext();

            const aplDoc = {
                type: 'APL',
                version: '1.5',
                import: [
                    {
                        name: 'alexa-layouts',
                        version: '1.2.0',
                    },
                ],
                styles: {
                    ComponentPlaceholderStyle: {
                        values: [
                            {
                                backgroundColor: '#779977',
                            },
                        ],
                    },
                    EditStyle: {
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
                                borderColor: 'green',
                                borderStrokeWidth: 2,
                            },
                        ],
                    },
                    NumberControlFrameStyle: {
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
                                borderColor: 'green',
                                borderStrokeWidth: 2,
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
                                id: 'ageComponent',
                                type: 'Frame',
                                position: 'absolute',
                                style: 'ComponentPlaceholderStyle',
                                top: '50vh',
                                left: '100px',
                                width: '400px',
                                height: '180px',
                                items: [
                                    this.ageControl.renderAPLComponent(
                                        {
                                            aplRenderContext,
                                            size: 'small',
                                        },
                                        input,
                                    ),
                                ],
                            },
                            {
                                id: 'guestsComponent',
                                type: 'Frame',
                                position: 'absolute',
                                style: 'ComponentPlaceholderStyle',
                                top: '30vh',
                                left: '600px',
                                width: '400px',
                                height: '60vh',
                                items: [
                                    this.guestsControl.renderAPLComponent(
                                        {
                                            aplRenderContext,
                                            size: 'large',
                                        },
                                        input,
                                    ),
                                ],
                            },
                            {
                                type: 'AlexaHeader',
                                style: 'ComponentPlaceholderStyle',
                                backgroundColor: '#557755',
                                id: 'heading1',
                                headerDivider: true,
                                headerBackButton: '${wrapper.general.headerBackButton}',
                                headerBackButtonCommand: {
                                    type: 'SendEvent',
                                    arguments: ['goBack'],
                                },
                                headerTitle: 'hello',
                                headerSubtitle: 'world',
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
                                    ],
                                },
                            },
                        ],
                    },
                },
            };

            //TODO: add styles into the doc.
            controlResponseBuilder.addAPLRenderDocumentDirective(
                'token',
                aplDoc,
                aplRenderContext.dataSources,
            );
        }
    }
}

export const handler = SkillBuilders.custom()
    .addRequestHandlers(new ControlHandler(new SinglePageApp.DemoControlManager()))
    .lambda();
