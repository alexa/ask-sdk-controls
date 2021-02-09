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

//todo: For each map.  If a duplicate key is added: ensure data is identical (via lodash _.Equals / deepEquals)

/**
 * Defines the mandatory props of a Control.
 */
export class APLRenderContext {
    public dataSources: { [key: string]: any } = {};
    public styles: { [key: string]: any } = {};
    public layouts: { [key: string]: any } = {};

    addDataSource(key: string, data: { [key: string]: any }) {
        this.dataSources[key] = data;
    }

    addStyle(key: string, data: { [key: string]: any }) {
        this.styles[key] = data;
    }

    addLayout(key: string, data: { [key: string]: any }) {
        this.layouts[key] = data;
    }
}
