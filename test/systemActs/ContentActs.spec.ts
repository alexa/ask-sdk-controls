import { suite, test } from 'mocha';
import { ContainerControl } from '../../src/controls/ContainerControl';
import { Control } from '../../src/controls/Control';
import { ControlManager } from '../../src/controls/ControlManager';
import { ControlHandler } from '../../src/runtime/ControlHandler';
import { SkillInvoker, TestResponseObject } from '../../src/utils/testSupport/SkillInvoker';
import { TestInput, testTurn } from '../../src/utils/testSupport/TestingUtils';
import { ControlInput } from '../../src/controls/ControlInput';
import { ControlResultBuilder } from '../../src/controls/ControlResult';
import { CanFulfillIntentAct } from '../../src/systemActs/ContentActs';
import { canfulfill } from 'ask-sdk-model';

suite('Test CanFulfillIntentRequest', () => {
    const canFulfillIntent: canfulfill.CanFulfillIntent = {
        canFulfill: 'YES',
        slots: {
            Artist: {
                canUnderstand: 'YES',
                canFulfill: 'YES',
            },
            Song: {
                canUnderstand: 'YES',
                canFulfill: 'YES',
            },
            DedicatedPerson: {
                canUnderstand: 'YES',
                canFulfill: 'YES',
            },
        },
    };
    class TestControlManager extends ControlManager {
        createControlTree(): Control {
            return new CustomRootControl({ id: 'root' });
        }
    }

    class CustomRootControl extends ContainerControl {
        async canHandle(input: ControlInput): Promise<boolean> {
            return input.request.type === 'CanFulfillIntentRequest';
        }

        async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
            if (input.request.type === 'CanFulfillIntentRequest') {
                resultBuilder.addAct(
                    new CanFulfillIntentAct(this, {
                        intent: canFulfillIntent,
                    }),
                );
            }
            return;
        }
    }

    test('CanFulfillIntentRequest', async () => {
        const requestHandler = new ControlHandler(new TestControlManager());
        const invoker = new SkillInvoker(requestHandler);
        const intentName = 'SendSongRequest';
        const expectedResponse: TestResponseObject = {
            responseEnvelope: {
                version: '',
                response: {
                    canFulfillIntent,
                },
            },
            prompt: '',
        };
        const slots = {
            Artist: {
                name: 'Artist',
                confirmationStatus: 'NONE',
            },
            Song: {
                name: 'Song',
                confirmationStatus: 'NONE',
            },
            DedicatedPerson: {
                name: 'DedicatedPerson',
                confirmationStatus: 'NONE',
            },
        };
        await testTurn(
            invoker,
            'U: __',
            TestInput.canFulfillIntentRequest(intentName, slots),
            expectedResponse,
        );
    });
});
