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

import { Logger } from '../logging/Logger';
import { ContainerControl, ContainerControlState } from './ContainerControl';
import { Control } from './Control';
import { IContainerControl } from './interfaces/IContainerControl';
import { ControlStateDiagramming } from './mixins/ControlStateDiagramming';

const log = new Logger('AskSdkControls:DynamicContainerControl');


class DynamicContainerControlState extends ContainerControlState {
    childInfo: any[];
}

/**
 *  A ContainerControl that changes its set of child controls during a session.
 *
 *  Purpose: 
 *  - The primary purpose is to delay the addition of controls that are only
 *    needed occasionally.  By only adding controls on demand the control tree
 *    remains compact and easy to inspect.  
 *    The alternative is to include all possible child controls and set them to
 *    be inactive until needed; this alternative is simpler when there are few
 *    potential controls but may not be convenient when there are many.
 *
 *  - Another potential use is to support an unbounded number of child controls
 *    of a certain type (e.g. add-another phone number, add-another filter
 *    criteria).  Many scenarios of this kind can be solve with a single control
 *    and a parent that reuses the control over and over.  However, dynamic
 *    controls can allow all the children to be active simultaneously which may
 *    be advantageous if the user could reasonably refer to any one at any time.
 *
 *  Usage:
 *   - The tricky part of managing a DynamicContainerControl is the
 *     re-initialization of the control at the start of each turn. To accomplish
 *     this, DynamicContainerControl introduces some conventions:
 *
 *   1. When adding a dynamic child control, call `this.addDynamicChild(info)`
 *      which will add a new control _and_ record the information necessary to
 *      recreate the control on subsequent turns.  Note that the parameter is
 *      some minimal information that distinguishes the control you wish to add.
 *      The `info` should be directly serializable and as simple as possible.
 *   2. Implement the method `createControlFromInfo(info)` to inspect the info
 *      and create the appropriate fully-configured control.
 *
 * Both `this.addDynamicChild()` and `this.removeDynamicChild()` update
 * `this.state.childInfo` to assist with this process.
 *
 *  Example: 
 *  ```
 *  class ContactInfoControl extends DynamicContainerControl: {
 *    handle(input, resultBuilder){
 *       // adding a new child control during handling.
 *       if(userWantsToAddFaxNumber){
 *         this.addDynamicChild('faxNumber')  // 'faxNumber' is the unique critical info to remember.
 *       }
 *    }
 *
 *    createChildFromInfo(info: any): Control {
 *      switch(childInfo){
 *         case 'faxNumber': return new ListControl( ...propsForFaxNumber...)
 *         default: throw new Error('unknown child info');
 *      }
 *    }
 *  }
 *  ```
 *
 *
 *  For general information about container controls, see `ContainerControl`
 */
export abstract class DynamicContainerControl extends ContainerControl implements IContainerControl, ControlStateDiagramming {
    state: DynamicContainerControlState;
    
    addDynamicChild(info: any){
        this.state.childInfo.push(info);
        this.addChild(this.createChildFromInfo(info));
    }

    removeDynamicControl(control: Control){
        //find the index
        const idx = this.children.indexOf(control);
        if(idx === -1){
            throw new Error('The control does not appear in the this.children array');
        }
        this.children.splice(idx, 1);
        this.state.childInfo.splice(idx, 1);        
    }

    abstract createChildFromInfo(info: any): Control;
    
    reestablishState(state: any, controlStateMap: { [index: string]: any }): void {
        if (state !== undefined) {
            this.setSerializableState(state);
        }
        this.recreateDynamicChildren(state, controlStateMap);
        for (const child of this.children) {
            child.reestablishState(controlStateMap[child.id], controlStateMap);
        }
    }

    recreateDynamicChildren(state: any, controlStateMap: { [index: string]: any }): void {
        for(const childInfo of this.state.childInfo){
            this.addChild(this.createChildFromInfo(childInfo));
        }
    }
}