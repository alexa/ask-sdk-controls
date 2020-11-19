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
 * Payload for ValueSetAct
 */
export interface ValueSetPayload<T> {
    /**
     * The control value.
     */
    value: T;

    /**
     * The rendered value.
     */
    renderedValue: string;
}

/**
 * Payload for ValueAddeddAct
 */
export interface ValueAddedPayload<T> {
    /**
     * The control value.
     */
    value: T;

    /**
     * The rendered value.
     */
    renderedValue: string;
}

/**
 * Payload for ValueRemovedAct
 */
export interface ValueRemovedPayload<T> {
    /**
     * The control value.
     */
    value: T;

    /**
     * The rendered value.
     */
    renderedValue: string;
}

/**
 * Payload for ValueClearedAct
 */
export interface ValueClearedPayload<T> {
    /**
     * The control value.
     */
    value: T;

    /**
     * The rendered value.
     */
    renderedValue: string;
}

/**
 * Payload for ValueChangedAct
 */
export interface ValueChangedPayload<T> {
    /**
     * The control value.
     */
    value: T;

    /**
     * The rendered value.
     */
    renderedValue: string;

    /**
     * The previous control value.
     */
    previousValue: T;

    /**
     * The previous rendered value.
     */
    renderedPreviousValue: string;
}

/**
 * Payload for InvalidValueAct
 */
export interface InvalidValuePayload<T> {
    value: T;
    renderedValue: string;
    reasonCode?: string;
    renderedReason?: string;
}

/**
 * Payload for UnusableInputValueAct
 */
export interface ProblematicInputValuePayload<T> {
    value: T;
    renderedValue: string;
    reasonCode: string;
    renderedReason?: string;
}

/**
 * Payload for RequestValueAct
 */
export interface RequestValuePayload {
    renderedTarget?: string;
}

/**
 * Payload for RequestChangedValueAct
 */
export interface RequestChangedValuePayload {
    currentValue: string;
    renderedValue: string;
    renderedTarget?: string;
}

/**
 * Payload for RequestValueByListAct
 */
export interface RequestValueByListPayload {
    choicesFromActivePage: string[];
    allChoices: string[];
    renderedChoicesFromActivePage: string[];
    renderedAllChoices: string[];
    renderedTarget?: string;
    renderedChoices?: string;
}

/**
 * Payload for RequestChangedValueByListAct
 */
export interface RequestChangedValueByListPayload {
    currentValue: string;
    renderedValue: string;
    choicesFromActivePage: string[];
    allChoices: string[];
    renderedChoicesFromActivePage: string[];
    renderedAllChoices: string[];
    renderedTarget?: string;
    renderedChoices?: string;
}

/**
 * Payload for RequestRemovedValueByListAct
 */
export interface RequestRemovedValueByListActPayload {
    availableChoicesFromActivePage: string[];
    availableChoices: string[];
    renderedChoicesFromActivePage: string[];
    renderedAvailableChoices: string[];
    renderedTarget?: string;
    renderedChoices?: string;
}

/**
 * Payload for LiteralInitiativeAct
 */
export interface LiteralContentPayload {
    promptFragment: string;
    repromptFragment?: string;
}
