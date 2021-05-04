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

import { DefaultLoggerFactory } from '../logging/DefaultLoggerFactory';
import { ILoggerFactory } from './interfaces/ILoggerFactory';

/**
 * Defines the props of Control services.
 */
export interface ControlServicesProps {
    /**
     * Logger instance used across controls.
     */
    logger: ILoggerFactory;
}

/**
 * Defines the ControlService used to customize logger implementation used
 * across the framework.
 */
export namespace ControlServices {
    /**
     * Provides default services
     */
    let defaults: ControlServicesProps;

    /**
     * Function to override the default Control service props.
     *
     * @param customServices - Input custom controls services
     */
    export function setDefaults(customServices: ControlServicesProps): void {
        defaults = customServices;
    }

    /**
     * Create a default control service object and set it to defaults
     *  which includes a default logger factory.
     */
    class DefaultControlServices {
        services: ControlServicesProps;

        constructor() {
            this.services = {
                logger: new DefaultLoggerFactory(),
            };
        }
    }

    /**
     * Function to retrieve Control services.
     *
     * @returns Control Service
     */
    export function getDefaults(): ControlServicesProps {
        if (defaults !== undefined) {
            return defaults;
        }
        const defaultServices = new DefaultControlServices();
        return defaultServices.services;
    }
}
