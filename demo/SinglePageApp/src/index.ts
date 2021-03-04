import { SkillBuilders } from 'ask-sdk-core';
import { ControlInput, ControlResponseBuilder, ControlResult, NumberControl } from '../../../src';
import { MultiValueListControl } from '../../../src/commonControls/multiValueListControl/MultiValueListControl';
import { ComponentModeControlManager } from '../../../src/controls/ComponentModeControlManager';
import { Control } from '../../../src/controls/Control';
import { ControlHandler } from '../../../src/runtime/ControlHandler';
import { DemoRootControl } from '../../Common/src/DemoRootControl';

export namespace SinglePageApp {
    export class DemoControlManager extends ComponentModeControlManager {
        ageControl: NumberControl;
        guestsControl: NumberControl;
        partyThemeControl: MultiValueListControl;

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

            rootControl.addChild(
                (this.partyThemeControl = new MultiValueListControl({
                    id: 'partyThemeControl',
                    listItemIDs: ['pirate', 'cartoon', 'fairy', 'monster'],
                    slotType: 'PartyTheme',
                    interactionModel: {
                        targets: ['builtin_choice', 'builtin_it', 'theme'],
                    },
                })),
            );

            return rootControl;
        }

        async renderAPL(
            result: ControlResult,
            input: ControlInput,
            controlResponseBuilder: ControlResponseBuilder,
        ): Promise<void> {
            controlResponseBuilder.addAPLDocumentStyle('ComponentPlaceholderStyle', {
                values: [
                    {
                        borderColor: 'white',
                        borderWidth: '2px',
                        padding: '0',
                    },
                ],
            });

            controlResponseBuilder.addAPLDocumentStyle('LabelStyle', {
                values: [
                    {
                        fontSize: '24dp',
                    },
                ],
            });

            // TODO: Improve APL Layout
            const aplDoc = {
                type: 'APL',
                version: '1.5',
                import: [
                    {
                        name: 'alexa-layouts',
                        version: '1.2.0',
                    },
                ],
                styles: {}, //placeholder
                layouts: {}, //placeholder
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
                        ],
                        items: [
                            {
                                id: 'label1',
                                type: 'Text',
                                style: 'LabelStyle',
                                position: 'absolute',
                                top: '150px',
                                left: '50px',
                                width: '200px',
                                height: '100px',
                                text: 'Your age:',
                            },
                            {
                                id: 'ageComponent',
                                type: 'Frame',
                                position: 'absolute',
                                style: 'ComponentPlaceholderStyle',
                                top: '200px',
                                left: '50px',
                                width: '200px',
                                height: '100px',
                                items: [
                                    this.ageControl.renderAPLComponent(
                                        { renderStyle: 'touchForward' },
                                        input,
                                        controlResponseBuilder,
                                    ),
                                ],
                            },
                            {
                                id: 'label2',
                                type: 'Text',
                                style: 'LabelStyle',
                                position: 'absolute',
                                top: '350px',
                                left: '50px',
                                width: '200px',
                                height: '100px',
                                text: 'Number of guests:',
                            },
                            {
                                id: 'guestsComponent',
                                type: 'Frame',
                                position: 'absolute',
                                style: 'ComponentPlaceholderStyle',
                                top: '400px',
                                left: '50px',
                                width: '200px',
                                height: '100px',
                                items: [
                                    this.guestsControl.renderAPLComponent(
                                        { renderStyle: 'touchForward' },
                                        input,
                                        controlResponseBuilder,
                                    ),
                                ],
                            },
                            {
                                id: 'label3',
                                type: 'Text',
                                style: 'LabelStyle',
                                position: 'absolute',
                                top: '150px',
                                left: '300px',
                                width: '200px',
                                height: '100px',
                                text: 'Theme:',
                            },
                            {
                                id: 'birthdayThemeComponent',
                                type: 'Frame',
                                position: 'absolute',
                                style: 'ComponentPlaceholderStyle',
                                top: '200px',
                                left: '300px',
                                width: '700px',
                                height: '360px',
                                items: [
                                    this.partyThemeControl.renderAPLComponent(
                                        { renderStyle: 'aggregateDuplicates' },
                                        input,
                                        controlResponseBuilder,
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
                                headerTitle: 'Chucky Cheese',
                                headerSubtitle: 'Birthday booking',
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

            aplDoc.layouts = controlResponseBuilder.aplDocumentLayouts;
            aplDoc.styles = controlResponseBuilder.aplDocumentStyles;

            //TODO: factor out the adding of context.style / context.dataSources / templates
            controlResponseBuilder.addAPLRenderDocumentDirective(
                'token',
                aplDoc,
                controlResponseBuilder.aplDocumentDataSources,
            );
        }
    }
}

export const handler = SkillBuilders.custom()
    .addRequestHandlers(new ControlHandler(new SinglePageApp.DemoControlManager()))
    .lambda();
