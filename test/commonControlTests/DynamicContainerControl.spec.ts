import { IntentRequest } from 'ask-sdk-model';
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
import { expect } from 'chai';
import { suite, test } from 'mocha';
import {
    NumberControl,
    ValueControlIntent,
    Strings,
    unpackValueControlIntent,
    ValueControl,
} from '../../src';
import { ContainerControl } from '../../src/controls/ContainerControl';
import { Control } from '../../src/controls/Control';
import { ControlInput } from '../../src/controls/ControlInput';
import { ControlManager } from '../../src/controls/ControlManager';
import { ControlResultBuilder } from '../../src/controls/ControlResult';
import {
    DynamicContainerControl,
    DynamicControlSpecification,
} from '../../src/controls/DynamicContainerControl';
import { unpackGeneralControlIntent } from '../../src/intents/GeneralControlIntent';
import { ControlHandler } from '../../src/runtime/ControlHandler';
import { SkillInvoker } from '../../src/utils/testSupport/SkillInvoker';
import { wrapRequestHandlerAsSkill } from '../../src/utils/testSupport/SkillWrapper';
import { TestInput, waitForDebugger } from '../../src/utils/testSupport/TestingUtils';

waitForDebugger();

/**
 * An example of a container control that dynamically adds child controls.
 *
 * The container tracks the children it has created in its state.
 * On each turn, it re-establishes its child controls and reattaches their
 * state.
 */
suite('== dynamic controls ==', () => {
    test('static and dynamic controls can coexist. adding and removing dynamic child controls works as expected', async () => {
        const control = new DynamicNumbersControl({ id: 'root' });

        control.addChild(new NumberControl({ id: 'staticChild_1' }));

        control.addDynamicChildBySpecification({ id: 'dynamicChild_1' });
        control.addDynamicChildBySpecification({ id: 'dynamicChild_2' });
        control.addDynamicChildBySpecification({ id: 'dynamicChild_3' });

        expect(control.children.length).equal(4);
        expect(control.state.dynamicChildSpecifications.length).equal(3);

        control.removeDynamicControl('dynamicChild_2');
        expect(control.children.length).equal(3);
        expect(control.state.dynamicChildSpecifications.length).equal(2);
        expect(control.children.find((x) => x.id === 'dynamicChild_2')).undefined;
    });

    test('e2e', async () => {
        let response;

        const requestHandler = new ControlHandler(new VariableControlsManager());
        const skill = new SkillInvoker(wrapRequestHandlerAsSkill(requestHandler));

        response = await skill.invoke(TestInput.launchRequest());
        expect(response.prompt).equals('What is your first name?');

        response = await skill.invoke(
            TestInput.of(ValueControlIntent.of('CUSTOM.name', { 'CUSTOM.name': 'Bob' })),
        );
        expect(response.prompt).equals('OK, Bob. And what is your last name, please?');
    });
});

// -------------
// Support classes for simple tests

class DynamicNumbersControl extends DynamicContainerControl {
    createDynamicChild(specification: DynamicControlSpecification): Control {
        return new NumberControl({ id: specification.id });
    }
}

// -------------
// Support classes for e2e tests

export class VariableControlsManager extends ControlManager {
    public createControlTree(): Control {
        const root = new ContainerControl({ id: 'root' });
        root.addChild(new MyMultiControl({ id: 'multiValueContainer' }));
        return root;
    }
}

/**
 * A custom container control that initially has no children. As the skill
 * session progresses it adds one and then another child.
 *
 * The only information that needs to be tracked to recreate the controls is
 * their id, hence the call to `addDynamicChild(specification = { id: 'firstName' })`.
 *
 * It is in createDynamicChild that the dynamic controls are actually created.
 */
export class MyMultiControl extends DynamicContainerControl {
    /**
     * a flag to help with prompt specialization. Note: this is not tracked in
     * state as it does not need to persist between turns
     */
    wasTheFirstNameCapturedThisTurn: boolean;

    async canHandle(input: ControlInput): Promise<boolean> {
        let request = input.request;
        if (request.type === 'LaunchRequest') {
            return true;
        }

        request = request as IntentRequest; // assume IntentRequest.
        const intent = request.intent;

        const unpacked =
            intent.name === 'GeneralControlIntent'
                ? unpackGeneralControlIntent(intent)
                : unpackValueControlIntent(intent);

        if (unpacked.action === 'addAnother') {
            return true;
        }

        return super.canHandle(input);
    }

    async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        let request = input.request;
        if (request.type === 'LaunchRequest') {
            // Dynamically add the first child
            this.addDynamicChildBySpecification({ id: 'firstName' });
            return;
        }
        request = request as IntentRequest; // assume IntentRequest.
        await super.handle(input, resultBuilder);

        if ((await this.children[0].isReady(input)) && this.children.length === 1) {
            // Dynamically add the second child
            this.addDynamicChildBySpecification({ id: 'lastName' });

            // And set a flag to tweak the next prompt a little
            // Note, this type of this is not tracked in state
            this.wasTheFirstNameCapturedThisTurn = true;
        }
        return;
    }

    createDynamicChild(spec: DynamicControlSpecification): Control {
        switch (spec.id) {
            case 'firstName':
                return this.makeFirstNameControl();
            case 'lastName':
                return this.makeLastNameControl();
            default:
                throw new Error('unknown');
        }
    }

    makeFirstNameControl(): Control {
        return new ValueControl({
            id: `firstName`,
            slotType: 'CUSTOM.name',
            prompts: {
                requestValue: 'What is your first name?',
            },
            interactionModel: { targets: [Strings.Target.It, 'name', 'firstName'] },
        });
    }

    makeLastNameControl(): Control {
        return new ValueControl({
            id: `lastName`,
            slotType: 'CUSTOM.name',
            prompts: {
                requestValue: (input) =>
                    this.wasTheFirstNameCapturedThisTurn
                        ? 'And what is your last name, please?'
                        : 'What is your last name?',
            },
            interactionModel: { targets: [Strings.Target.It, 'name', 'lastName'] },
        });
    }
}
