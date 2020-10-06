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
import { Logger } from '../logging/Logger';
import { ContainerControl, ContainerControlProps, ContainerControlState } from './ContainerControl';
import { Control } from './Control';
import { IContainerControl } from './interfaces/IContainerControl';
import { ControlStateDiagramming } from './mixins/ControlStateDiagramming';

const log = new Logger('AskSdkControls:DynamicContainerControl');

/**
 * Base type for a dynamic control specification.
 */
export interface DynamicControlSpecification {
    id: string;
}

/**
 * State information for a DynamicContainerControl
 *
 * The state comprises the usual state for a container control and adds tracking
 * of the dynamic controls that have been added.  This information is used to
 * recreate the child controls on subsequent turns.
 *
 * Each specification should be a POJO object describing the unique
 * characteristics of the child control such as its ID.
 */
export class DynamicContainerControlState extends ContainerControlState {
    dynamicChildSpecifications: DynamicControlSpecification[] = [];
}

/**
 *  A ContainerControl that changes the set of child controls during a session.
 *
 *  Purpose:
 *  - A DynamicContainerControl can delay and perhaps avoid the addition of
 *    child controls that are only needed occasionally.  By adding controls
 *    on-demand the control tree remains compact and easy to reason about. The
 *    alternative is to include all possible child controls and set them to be
 *    inactive until needed; this alternative is simpler when there are few
 *    potential controls but is less convenient when there are many.
 *
 *  - A potential purpose is to support an unbounded number of child controls of
 *    a certain type (e.g. add-another-phone-number,
 *    add-another-filter-criteria). By adding additional controls the user can
 *    potentially refer to any of the children at any time (via each control's
 *    target prop) and each control can have its own durable state. However, if
 *    the user will only discuss one 'active' item at a time it may be simpler
 *    to use a static container control that manages the list data directly and
 *    which reconfigures static child controls whenever the active item changes.
 *
 *  Details: The tricky part of managing a DynamicContainerControl is the
 *  re-initialization of the control at the start of each turn. To accomplish
 *  this, DynamicContainerControl introduces new conventions:
 *
 *   1. The unique details for each dynamic control are tracked in `this.state`.
 *      The details for creation of a dynamic control is a minimal POJO called
 *      its `specification`.  In simple cases a child specification may be only
 *      the control ID but in complex cases it can be an object, or any object
 *      that can be converted to a serializable form during
 *      `Control.getSerializableState()`
 *   2. The built-in method `this.addDynamicChild(specification)` calls
 *      `this.createDynamicChild(specification)` to actually instantiate the
 *      control. `this.addDynamicChild()` also records that the child was
 *      created in `this.state.dynamicChildSpecifications`.
 *
 * Usage:
 *   1. implement the abstract function `createDynamicChild(specification)` to
 *      create a control from a simple POJO describing the type of child
 *      required.
 *   2. in `handle()`, use `this.addDynamicChild(specification)` to add a
 *      dynamic child and `this.removeDynamicChild(control)` to remove a dynamic
 *      child.
 *
 *  Example:
 * ```
 *  class ContactInfoControl extends DynamicContainerControl: {
 *    handle(input, resultBuilder){
 *       // adding a new child control during handling.
 *       if(userWantsToAddFaxNumber){
 *         this.addDynamicChild('faxNumber')  // 'faxNumber' is the unique critical info to remember.
 *       }
 *    }
 *
 *    createChildFromInfo(spec: DynamicControlSpecification): Control {
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
 *  contain functions and references.  Dynamic controls further complicate
 *  matters as we cannot know which controls to rebuild until we have
 *  reestablished some state.
 *
 *  By rebuilding controls statically (normal case) and from POJO specifications
 *  (dynamic case) we can limit the information that must be tracked and still
 *  rebuild controls with all their complex props.  Overall, these patterns
 *  allow for arbitrarily complex props while ensuring that only the critical
 *  state information must be written and reloaded for each turn.
 *
 *  The dynamic-control pattern is standardized in DynamicContainerControl to
 *  reduce the need for developers to reinvent the wheel.
 */
export abstract class DynamicContainerControl
    extends ContainerControl
    implements IContainerControl, ControlStateDiagramming {
    state: DynamicContainerControlState;

    constructor(props: ContainerControlProps) {
        super(props);
        this.state = new DynamicContainerControlState();
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
    addDynamicChild(specification: DynamicControlSpecification): void {
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
     * Create a Control object from a DynamicControlSpecification
     *
     * Purpose:
     *  - This method is called to create a dynamic control at the time of first
     *    creation and during the initialization phase of every subsequent turn.
     *
     * Usage:
     *  - inspect the specification object and determine the type of Control to
     *    instantiate.
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
