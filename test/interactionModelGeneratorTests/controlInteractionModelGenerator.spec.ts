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

import { v1 } from 'ask-smapi-model';
import { expect } from 'chai';
import { Resource } from 'i18next';
import { suite, test } from 'mocha';
import sinon from 'sinon';
import { ContainerControl, Control, ControlManager, ModelData } from '../../src';
import { InteractionModelContributor } from '../../src/controls/mixins/InteractionModelContributor';
import { GeneralControlIntent } from '../../src/intents/GeneralControlIntent';
import { ValueControlIntent } from '../../src/intents/ValueControlIntent';
import { ControlInteractionModelGenerator } from '../../src/interactionModelGeneration/ControlInteractionModelGenerator';
import { SharedSlotType } from '../../src/interactionModelGeneration/ModelTypes';
import { Logger } from '../../src/logging/Logger';
import { jsonProvider } from './interactionModelForTest';

import InteractionModelData = v1.skill.interactionModel.InteractionModelData;

class SingleValueTestControl extends Control implements InteractionModelContributor {
    canHandle(): boolean {
        return true;
    }
    handle(): void {}
    canTakeInitiative(): boolean {
        return true;
    }
    takeInitiative(): void {}

    updateInteractionModel(generator: ControlInteractionModelGenerator, imData: ModelData) {
        generator.addControlIntent(new ValueControlIntent('TEST'), imData);
    }
}
class SimpleTestControl extends Control implements InteractionModelContributor {
    canHandle(): boolean {
        return true;
    }
    handle(): void {}
    canTakeInitiative(): boolean {
        return true;
    }
    takeInitiative(): void {}
    updateInteractionModel(generator: ControlInteractionModelGenerator, imData: ModelData) {
        generator.addControlIntent(new GeneralControlIntent(), imData);
    }
}
class TestControlManager extends ControlManager {
    createControlTree() {
        const rootControl = new ContainerControl({
            id: 'testRootControl',
        });
        rootControl
            .addChild(new SingleValueTestControl('singleValueTestControl'))
            .addChild(new SimpleTestControl('simpleTestControl'));

        return rootControl;
    }
}

const TEST_INVOCATION_NAME: string = 'TEST_INVOCATION_NAME';

suite('ControlInteractionModel Generator tests', () => {
    afterEach(() => {
        sinon.restore();
    });
    suite('buildCoreModelForControls tests', () => {
        test('buildCoreModelForControls should successfully build IM for controls tree', () => {
            sinon.stub(Logger.prototype, 'warn');
            const interactionModel = new ControlInteractionModelGenerator()
                .buildCoreModelForControls(new TestControlManager())
                .withInvocationName(TEST_INVOCATION_NAME)
                .build();

            // sanity test that model data is in fact being produced.
            expect(interactionModel.interactionModel?.languageModel?.intents![0].name).equals(
                'TEST_ValueControlIntent',
            );
        });

        test('When locale is not supported, it should use default i18n resources ', () => {
            const interactionModel = new ControlInteractionModelGenerator()
                .buildCoreModelForControls(new TestControlManager({ locale: 'fr-FR' }))
                .withInvocationName(TEST_INVOCATION_NAME)
                .build();

            // sanity test that model data is in fact being produced.
            expect(interactionModel.interactionModel?.languageModel?.intents![0].name).equals(
                'TEST_ValueControlIntent',
            );
        });

        test('i18nOverride should work as expected', () => {
            sinon.stub(Logger.prototype, 'warn');
            const targetInFR = {
                name: SharedSlotType.TARGET,
                values: [
                    {
                        id: 'it',
                        name: {
                            value: 'la',
                            synonyms: ['it', 'il', 'le'],
                        },
                    },
                ],
            };
            const i18nOverride = {
                fr: {
                    translation: {
                        SHARED_SLOT_TYPES_TARGET: targetInFR,
                    },
                },
            };
            const interactionModel = new ControlInteractionModelGenerator()
                .buildCoreModelForControls(
                    new TestControlManager({ locale: 'fr-FR', i18nResources: i18nOverride }),
                )
                .withInvocationName(TEST_INVOCATION_NAME)
                .build();

            const expectedInteractionModel: InteractionModelData = jsonProvider.loadFromMockControls();
            expectedInteractionModel.interactionModel?.languageModel?.types?.map((slotType) => {
                if (slotType.name === SharedSlotType.TARGET) {
                    slotType.values = targetInFR.values;
                }
                return slotType;
            });

            // sanity test that model data is in fact being produced.
            expect(interactionModel.interactionModel?.languageModel?.intents![0].name).equals(
                'TEST_ValueControlIntent',
            );

            // Test that french is popping out.
            const targetType = interactionModel!.interactionModel!.languageModel!.types!.find(
                (x) => x.name === 'target',
            );
            expect(targetType!.values![0].name?.value).equals('la');
        });

        test('When provided override is is not complete, should use the default resource', () => {
            const emptyResourceInEN: Resource = {
                en: {
                    translation: {},
                },
            };
            const interactionModel = new ControlInteractionModelGenerator()
                .buildCoreModelForControls(new TestControlManager({ i18nResources: emptyResourceInEN }))
                .withInvocationName(TEST_INVOCATION_NAME)
                .build();
            const expectedInteractionModel: InteractionModelData = jsonProvider.loadFromMockControls();

            // sanity test that model data is in fact being produced.
            expect(interactionModel.interactionModel?.languageModel?.intents![0].name).equals(
                'TEST_ValueControlIntent',
            );
        });

        test('3P controls without dependency on ControlIntent should be allowed to update IM', () => {
            class TESTControl extends Control implements InteractionModelContributor {
                canHandle(): boolean {
                    return true;
                }
                handle(): void {}
                canTakeInitiative(): boolean {
                    return true;
                }
                takeInitiative(): void {}
                updateInteractionModel(generator: ControlInteractionModelGenerator) {
                    generator.addIntents({
                        name: 'testIntent',
                        samples: ['hello world'],
                    });
                }
            }
            class SimpleControlManager extends ControlManager {
                createControlTree() {
                    return new TESTControl('test');
                }
            }
            const interactionModel = new ControlInteractionModelGenerator()
                .buildCoreModelForControls(new SimpleControlManager())
                .withInvocationName(TEST_INVOCATION_NAME)
                .build();

            expect(interactionModel.interactionModel?.languageModel?.intents![0].name === 'testIntent');
        });
    });
});
