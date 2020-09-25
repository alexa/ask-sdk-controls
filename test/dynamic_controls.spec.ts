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
import { SingleValueControlIntent, Strings, unpackSingleValueControlIntent, ValueControl } from '../src';
import { ContainerControl, ContainerControlState } from '../src/controls/ContainerControl';
import { Control } from '../src/controls/Control';
import { ControlInput } from '../src/controls/ControlInput';
import { ControlManager } from '../src/controls/ControlManager';
import { ControlResultBuilder } from '../src/controls/ControlResult';
import { unpackGeneralControlIntent } from '../src/intents/GeneralControlIntent';
import { ControlHandler } from '../src/runtime/ControlHandler';
import { SkillInvoker } from '../src/utils/testSupport/SkillInvoker';
import { wrapRequestHandlerAsSkill } from '../src/utils/testSupport/SkillWrapper';
import { TestInput, waitForDebugger } from '../src/utils/testSupport/TestingUtils';

waitForDebugger();

/**
 * An example of a container control that dynamically adds child controls.
 *
 * The container tracks the children it has created in its state.
 * On each turn, it re-establishes its child controls and reattaches their
 * state.
 */
suite('== dynamic controls ==', () => {
    test('e2e', async () => {
        let response;

        const requestHandler = new ControlHandler(new VariableControlsManager());
        const skill = new SkillInvoker(wrapRequestHandlerAsSkill(requestHandler));

        response = await skill.invoke(TestInput.launchRequest());
        expect(response.prompt).equals('What is your first name?');

        response = await skill.invoke(
            TestInput.of(SingleValueControlIntent.of('CUSTOM.name', { 'CUSTOM.name': 'Bob' })),
        );
        expect(response.prompt).equals('OK, Bob. And what is your last name, please?');
    });
});

export class VariableControlsManager extends ControlManager {
    public createControlTree(): Control {
        const root = new ContainerControl({ id: 'root' });
        root.addChild(new MyMultiControl({ id: 'multiValueContainer' }));
        return root;
    }
}

export class MyMultiControlState extends ContainerControlState {
    childrenTypes: string[] = [];

    constructor(childrenTypes: string[] = []) {
        super();
        this.childrenTypes = childrenTypes;
    }
}

/**
 * A custom container control that initially has no children. As the skill
 * session progresses it adds one and then another child.
 *
 * See reestablishState which does the custom logic to rebuild the tree on
 * subsequent turns so that the structure is correct and the state is
 * reestablished.
 *
 * Note that only the variable state for the child controls is saved.. the props,
 * which are static and which may include arbitrary functions, are not saved but
 * rather they are rebuilt. E.g. see this.makeFirstNameControl() which recreates
 * the control.  after this re-creation, its state is reattached.
 */
export class MyMultiControl extends ContainerControl {
    state: MyMultiControlState;

    // a flag to help with prompt specialization.
    wasTheFirstNameCapturedThisTurn: boolean;

    constructor(props: { id: string }) {
        super(props);
        this.state = new MyMultiControlState();
    }

    reestablishState(state: any, controlStateMap: { [index: string]: any }): void {
        if (state) {
            this.setSerializableState(state);
        }

        // refresh child controls by inspecting this.state.childrenTypes
        // Note that the child control IDs must be recreated without change.
        for (const [idx, childType] of this.state.childrenTypes.entries()) {
            if (childType === 'firstName') {
                this.addChild(this.makeFirstNameControl());
            }
            if (childType === 'lastName') {
                this.addChild(this.makeLastNameControl());
            }
        }

        super.reestablishState(state, controlStateMap);
    }

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
                : unpackSingleValueControlIntent(intent);

        if (unpacked.action === 'addAnother') {
            return true;
        }

        return this.canHandleByChild(input);
    }

    async handle(input: ControlInput, resultBuilder: ControlResultBuilder): Promise<void> {
        let request = input.request;
        if (request.type === 'LaunchRequest') {
            // Dynamically add the first child
            this.addChild(this.makeFirstNameControl());
            this.state.childrenTypes.push('firstName');
            return;
        }
        request = request as IntentRequest; // assume IntentRequest.
        await this.handleByChild(input, resultBuilder);

        if (this.children[0].isReady(input) && this.children.length === 1) {
            // Dynamically add the second child
            this.addChild(this.makeLastNameControl());
            this.state.childrenTypes.push('lastName');

            // And set a flag to tweak the next prompt a little
            // Note, this type of this is not tracked in state
            this.wasTheFirstNameCapturedThisTurn = true;
        }
        return;
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
