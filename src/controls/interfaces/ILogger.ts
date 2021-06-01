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
 * Defines the Logger interface to define the logging format and
 * log level used across the framework.
 */
export interface ILogger {
    moduleName: string;

    /**
     * Log a message as an "error".
     * @param message - Message
     */
    error(message: string): void;

    /**
     * Log a message as an "informational" message.
     * @param message - Message
     */
    info(message: string): void;

    /**
     * Log a message as an "warning".
     * @param message - Message
     */
    warn(message: string): void;

    /**
     * Log a message as an "low-level debug message".
     * @param message - Message
     */
    debug(message: string): void;

    /**
     * Log an object with pretty print formatting and also
     * masking sensitive information if required
     *
     * @param id - Unique label.
     * @param object - Object to be logged
     */
    logObject(level: string, id: string, object: any, stringify?: boolean): void;

    /**
     * Function that returns string with special characters to
     *  mask restrictive information.
     *
     * @param message - Logging message
     */
    sanitize(message: any): string;
}
