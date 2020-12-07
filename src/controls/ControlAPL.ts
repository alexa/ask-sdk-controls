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

import { ControlInput, ControlResultBuilder } from '..';
import { SystemAct } from '../systemActs/SystemAct';
import { ControlState } from './Control';

export interface ControlAPL<TAct extends SystemAct, TState extends ControlState> {
    //TODO: act isn't relevant.  control would be more useful. as would input.
    //      Change to  (control, input) => doc
    document?: { [key: string]: any } | ((act: TAct, state: TState) => { [key: string]: any });

    //TODO: as above
    dataSource?: { [key: string]: any } | ((act: TAct, state: TState) => { [key: string]: any });

    //TODO: this is getting too complex.  need a more obvious/organized approach to input mapping.
    customHandlingFuncs?: Array<{
        canHandle: (input: ControlInput) => boolean | Promise<boolean>;
        handle: (input: ControlInput, resultBuilder: ControlResultBuilder) => void | Promise<void>;
    }>;
}
