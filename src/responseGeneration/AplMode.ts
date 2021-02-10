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

/**
 * APL rendering mode
 */
export enum APLMode {
    /**
     * Controls add APL directives directly to the ResponseBuilder as they are rendering
     * their prompts.
     */
    DIRECT = 'Direct',

    /**
     * The top-level ControlManager.renderAPL produces the APL for each turn.
     *   - typically this will be a master document that includes various control.renderAPL calls.
     *
     * Controls do not render APL directives during renderAct.
     */
    WHOLE_APP = 'WholeApp',
}

function a(x: APLMode) {}
