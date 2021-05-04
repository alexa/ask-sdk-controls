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
import Debug from 'debug';
import { ILogger } from '../controls/interfaces/ILogger';

const DEFAULT_LOG_LEVEL = 'error:*, warn:*';

/**
 * Default Logger Implementation.
 *
 * This wraps the Debug object from npm 'Debug' package to provide "log-levels".
 * The log-levels are handled as top-level namespaces.
 *
 * Examples
 * ```
 * export DEBUG="error:*" -> Log 'error' messages from every module
 * export DEBUG="error:moduleA" -> Log 'error' messages for moduleA only
 * export DEBUG="error:*, warn:*, info:*, debug:*" -> Log everything
 * ```
 *
 * See https://www.npmjs.com/package/debug for more information on
 * configuration.
 *
 * When instantiated for a given "moduleName", this object provides an `error()`
 * function that logs with amended name "error:moduleName". Likewise for `warn()`,
 * `info()`, and `debug()`.
 */
export class DefaultLogger implements ILogger {
    moduleName: string;

    constructor(moduleName: string) {
        this.moduleName = moduleName;

        const namespace = process.env.DEBUG ?? DEFAULT_LOG_LEVEL;
        Debug.enable(namespace);
    }

    /**
     * Log a message as an "error".
     * @param message - Message
     */
    error(message: string): void {
        Debug(`error:${this.moduleName}`)(message);
    }

    /**
     * Log a message as an "warning".
     * @param message - Message
     */
    warn(message: string): void {
        Debug(`warn:${this.moduleName}`)(message);
    }

    /**
     * Log a message as an "informational" message.
     * @param message - Message
     */
    info(message: string): void {
        Debug(`info:${this.moduleName}`)(message);
    }

    /**
     * Log a message as an "low-level debug message".
     * @param message - Message
     */
    debug(message: string): void {
        Debug(`debug:${this.moduleName}`)(message);
    }

    /**
     * Log an object with pretty print formatting and also
     * masking sensitive information if required
     *
     * @param id - Unique label.
     * @param object - Object to be logged
     */
    logObject(logLevel: string, id: string, object: any, stringify?: true): void {
        const objectToLogJson: string = stringify !== true ? object : JSON.stringify(object, null, 2);
        const message = this.sanitize(objectToLogJson);
        Debug(`${logLevel}:${this.moduleName} ${id}`)(message);
    }

    /**
     * Function that returns string with actual message if sensitive logging is
     * turned off or returns special character string masking the information.
     *
     * @param message - Logging message
     *
     * Eg: When sensitive logging is turned on
     * "env": \{
     *      "ASK_SDK_RESTRICTIVE_LOGGING": "true"
     * \}
     *
     * All messages which are wrapped around `sanitize()` in log.info for example
     * are masked using special characters.
     */
    sanitize(message: any): string {
        if (
            process.env.ASK_SDK_RESTRICTIVE_LOGGING !== undefined &&
            process.env.ASK_SDK_RESTRICTIVE_LOGGING === 'true'
        ) {
            return '****';
        } else {
            return message;
        }
    }
}
