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

import _ from 'lodash';
import { ContainerControl, ContainerControlProps, ContainerControlState } from './ContainerControl';
import { Control } from './Control';
import { ControlServices } from './ControlServices';
import { IContainerControl } from './interfaces/IContainerControl';
import { ILogger } from './interfaces/ILogger';
import { ControlStateDiagramming } from './mixins/ControlStateDiagramming';

const MODULE_NAME = 'AskSdkControls:DynamicContainerControl';

/**
 * Defines the minimal information for a dynamic control specification.
 *
 * Usage:
 * - A specification should be the minimal information required to create a
 *   dynamic control.  For example it may be enough to know just the ID if that
 *   is one-to-one with the code to construct the control.  If it is necessary
 *   to know both the ID and some type information, the specification should
 *   contain both.
 * - A specification should not contain any non-unique information.
 * - A specification must be serializable via `JSON.stringify()`, or convertible
 *      to a serializable form during `Control.getSerializableState()`
 *
 * Example:
 * - Consider a `ContactDetailsControl` that adds controls of two different
 *   types depending on what information the user needs to record. Lets assume
 *   that the only dynamic data-fields are of type `PhoneNumberControl` &
 *   `AddressControl`.  To uniquely define each dynamic control we need to know
 *   the id, the type, and the purpose/target.  So an appropriate specification
 *   would be:
 * ```
 * DynamicContactControlSpecification:{
 *   id: string
 *   type: {'phoneNumber', 'home'} | {'phoneNumber', 'work'} | {'address', 'home'} | ...
 * }
 *
 * ```
 *
 * Note:
 * - the `id` is a mandatory part of the specification because it is needed to
 *   reattach the control's state object on subsequent turns.
 */
export interface DynamicControlSpecification {
    /**
     * Unique identifier for the dynamic control.
     */
    id: string;
}

/**
 * State information for a DynamicContainerControl
 *
 * In addition to the usual state for a container control this adds tracking of
 * the dynamic control specifications to aid recreation of the child controls on
 * subsequent turns.
 */
export class DynamicContainerControlState extends ContainerControlState {
    dynamicChildSpecifications: DynamicControlSpecification[] = [];
}

/**
 *  A ContainerControl that adds/removes child controls during a session.
 *
 *  Purpose:
 *  - A `DynamicContainerControl` delays and perhaps avoids the addition of
 *    child controls that are only needed occasionally.  By adding controls
 *    on-demand the control tree remains compact and easy to reason about. The
 *    alternative is to include all possible child controls and set them to be
 *    inactive until needed; this alternative may be simpler when there are few
 *    potential controls but is less convenient when there are many.
 *
 *  - A potential purpose is to support an unbounded number of child controls of
 *    a certain type (e.g. add-another-phone-number, add-another-address). By
 *    adding additional controls the user can refer to any of the children at
 *    any time (via each control's target prop) and each control can have its
 *    own durable state. However, if the user will only discuss one 'active'
 *    item at a time it may be simpler to use a regular container control that
 *    manages the list data directly and which reconfigures static child
 *    controls whenever the active item changes (see the FruitShop demo skill
 *    for an example of this approach).
 *
 * Details:
 *
 * The tricky part of managing a `DynamicContainerControl` is the
 * re-initialization of the control at the start of each turn. To accomplish
 * this, `DynamicContainerControl` introduces new conventions:
 *
 *   1. The minimal specification for each dynamic control is tracked in
 *      `this.state.dynamicChildSpecifications`.
 *   2. The built-in method `this.addDynamicChildBySpecification(specification)`
 *      calls `this.createDynamicChild(specification)` to actually instantiate
 *      the control. `this.addDynamicChildBySpecification()` also records that
 *      the child was created in `this.state.dynamicChildSpecifications`.
 *
 * Usage:
 *   1. implement the abstract function `createDynamicChild(specification)` to
 *      create a control from a specification object.
 *   2. in `handle()`, use `this.addDynamicChildBySpecification(specification)`
 *      to add a dynamic child and `this.removeDynamicChild(control)` to remove
 *      a dynamic child.
 *
 *  Example:
 * ```
 *  class ContactInfoControl extends DynamicContainerControl: {
 *    handle(input, resultBuilder){
 *       // adding a new child control during handling.
 *       if(userWantsToAddFaxNumber){
 *         this.addDynamicChildBySpecification({id: 'faxNumber'})
 *       }
 *    }
 *
 *    createDynamicChild(spec: DynamicControlSpecification): Control {
 *      switch(spec.id){
 *         case 'faxNumber': return new ListControl( ...propsForFaxNumber...)
 *         default: throw new Error('unknown child info');
 *      }
 *    }
 *  }
 * ```
 *
 *  Q & A: Why is all this necessary?
 *
 *  The problem being solved by `ControlManager.createControlTree()` and
 *  `Control.reestablishState()` is to recreate a tree of controls in which each
 *  control includes both configuration props and state.  The first complication
 *  is that the configuration props are generally not serializable as they may
 *  contain functions and deep references. Dynamic controls further complicate
 *  matters as we cannot know which controls to rebuild until we have
 *  reestablished some state.
 *
 *  By rebuilding controls statically (normal case) and from POJO specifications
 *  (dynamic case) we can limit the information that must be tracked and still
 *  rebuild controls with all their complex props and state.  Overall, these
 *  patterns allow for arbitrarily complex props while ensuring that only the
 *  critical information is tracked between turns.
 *
 *  The dynamic-control pattern is standardized in `DynamicContainerControl` to
 *  reduce the need for developers to reinvent the wheel.
 */
export abstract class DynamicContainerControl
    extends ContainerControl
    implements IContainerControl, ControlStateDiagramming {
    state: DynamicContainerControlState;
    log: ILogger;

    constructor(props: ContainerControlProps) {
        super(props);
        this.state = new DynamicContainerControlState();
        this.log = ControlServices.getLogger(MODULE_NAME);
    }

    /**
     * Adds a new dynamic child control.
     *
     * The child is added to the end of the `this.children` array.
     *
     * @param specification - object defining the control to create. The
     * specification should be minimal information that enables the creation of
     * a complete control.  An `id` is mandatory, and any other information is
     * optional.  The specification must be serializable or convertible to a
     * serialized form.
     */
    addDynamicChildBySpecification(specification: DynamicControlSpecification): void {
        this.state.dynamicChildSpecifications.push(specification);
        this.addChild(this.createDynamicChild(specification));
    }

    /**
     * Removes a dynamic control.
     *
     * The control is removed from `this.children` and the specification is
     * removed from `this.state.dynamicChildSpecifications`
     */
    removeDynamicControl(id: string): void {
        _.remove(this.children, (c) => c.id === id);
        _.remove(this.state.dynamicChildSpecifications, (s) => s.id === id);
    }

    /**
     * Create a Control from a DynamicControlSpecification
     *
     * Purpose:
     *  - This method is called to create a dynamic control at the time of first
     *    creation and during the initialization phase of every subsequent turn.
     *
     * Usage:
     *  - Inspect the specification object and determine the type of Control to
     *    instantiate.
     *  - Instantiate a new control and ensure control.id = specification.id.
     */
    abstract createDynamicChild(specification: DynamicControlSpecification): Control;

    // jsDoc: see `Control`
    reestablishState(state: any, controlStateMap: { [index: string]: any }): void {
        if (state !== undefined) {
            this.setSerializableState(state);
        }
        for (const childInfo of this.state.dynamicChildSpecifications) {
            this.addChild(this.createDynamicChild(childInfo));
        }
        for (const child of this.children) {
            child.reestablishState(controlStateMap[child.id], controlStateMap);
        }
    }
}
