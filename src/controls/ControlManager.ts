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

import { HandlerInput } from 'ask-sdk-core';
import i18next, { Resource } from 'i18next';
import _ from 'lodash';
import { defaultI18nResources } from '../commonControls/LanguageStrings';
import { Control } from '../controls/Control';
import { implementsInteractionModelContributor } from '../controls/mixins/InteractionModelContributor';
import {
    ControlInteractionModelGenerator,
    _generateModelData,
} from '../interactionModelGeneration/ControlInteractionModelGenerator';
import { ModelData } from '../interactionModelGeneration/ModelTypes';
import { Logger } from '../logging/Logger';
import { ControlResponseBuilder } from '../responseGeneration/ControlResponseBuilder';
import { SystemAct } from '../systemActs/SystemAct';
import { ControlInput } from './ControlInput';
import { ControlResult } from './ControlResult';
import { isContainerControl } from './interfaces/IContainerControl';
import { IControl } from './interfaces/IControl';
import { IControlManager } from './interfaces/IControlManager';

const log = new Logger('AskSdkControls:ControlManager');

/**
 * Properties for creating a ControlManager instance.
 */
export interface ControlManagerProps {
    locale?: string;
    i18nResources?: Resource;
}

/**
 * Defines the high-level functionality for a skill built with Controls.
 *
 * Each skill that uses controls should define a concrete sub-class that
 * implements `createControlTree` and optionally overrides other methods.
 *
 * Summary:
 *  * createControlTree() creates a hierarchy of controls that cooperatively
 *    manage the skill behavior.
 *   * The methods on the root control will be called to process the user's
 *     input and to generate system initiative.
 *
 *  * render() is the entry-point for the render-phase.
 *   * High-level overrides and multi-act rendering should be performed by
 *     `controlManager.render()`. The default is to render each act one-by-one
 *     by calling `control.renderAct(act)`.  This builds up a result by
 *     concatenation of response fragments which is sufficient in many cases.
 *
 *  * The `ControlResult` contains a list of SystemActs that describe *what*
 *    should be communicated to the user but generally should not describe *how*
 *    to present it.
 *
 *  * `handleInternalError` provides an entry-point for custom handling of
 *    internal errors.
 *
 *  * `buildInteractionModel` provides an entry-point for building the
 *    Control-specific aspects of skill's Interaction Model.
 *
 * Internationalization and Localization
 *  * Controls themselves are location-agnostic.  They consume abstract inputs
 *    (Intents, etc) and produce abstract outputs (SystemActs)
 *
 *  * Mapping localized input to abstract inputs is the role of NLU and the
 *    necessary information is stored in the Interaction Model.
 *   * The ControlManager props includes a bag of localization data that is used
 *     during interaction-model building for a given locale.
 *   * The framework ships with a default set of interaction model data for
 *     en-US.
 *
 *  * Mapping abstract output to physical output (prompts, APL strings) etc is
 *    the role of the rendering phase.  This information is part of the skill
 *    definition but can be located in various places: either in a monolithic
 *    render() function, or scattered around the various Controls and Acts.
 */
export abstract class ControlManager implements IControlManager {
    /**
     * Default key name used to store control state data between turns.
     */
    static DEFAULT_CONTROL_STATE_ATTRIBUTE_KEY = '__controlState';

    /**
     * The custom props provided during construction
     */
    rawProps?: ControlManagerProps;

    /**
     * The complete props used during construction.
     */
    props: Readonly<Required<ControlManagerProps>>;

    /**
     * Creates an instance of a Control Manager.
     * @param props - props
     */
    constructor(props?: ControlManagerProps) {
        this.rawProps = props;
        this.props = ControlManager.mergeWithDefaultProps(props);
        const resource: Resource = _.merge(defaultI18nResources, this.props.i18nResources);
        i18nInit(this.props.locale, resource);
    }

    /**
     * Merges the user-provided props with the default props.
     *
     * Any property defined by the user-provided data overrides the defaults.
     */
    static mergeWithDefaultProps(props: ControlManagerProps | undefined): Required<ControlManagerProps> {
        const defaults: Required<ControlManagerProps> = {
            locale: 'en-US',
            i18nResources: {},
        };

        return _.mergeWith(defaults, props);
    }

    /**
     * Creates a tree of controls to handle state management and dialog
     * decisions for the skill.
     *
     * Usage:
     * - Each control in the tree can and should be created with empty state.
     *
     * - In advanced scenarios the tree shape may change as the skill session
     *   progresses. Dynamic controls should be rebuilt during
     *   `ControlManager.reestablishControlStates()`.
     *
     * @returns A `Control`, typically a `ContainerControl`, that is the root of a tree.
     */
    abstract createControlTree(): Control;

    /**
     * Reestablish the state of all controls.
     *
     * Purpose:
     * - On the second and subsequent turns this method reestablishes the state
     *   of controls from saved/serialized information.
     * - This method should also reestablish any dynamic controls (controls that
     *   are added at runtime, rather than being statically created by `createControlTree`)
     *
     * Notes:
     * - To keep serialized state to a minimum, and due to the lack of
     *   object-aware serialization in  Javascript, re-creation of the complete
     *   control tree occurs in two phases:
     *     1. Build the static control tree as in the very first turn.
     *     2. Reattach state and rebuild the dynamic portions of the control tree.
     * - This approach keeps the props and state of controls separate and keeps
     *   the common cases as simple as possible.
     */
    reestablishControlStates(rootControl: IControl, stateMap: { [key: string]: any }): void {
        rootControl.reestablishState(stateMap[rootControl.id], stateMap);
    }

    /**
     * Transforms the information in ControlResult into user-facing content
     * (prompts and APL).
     *
     * Default: The default rendering strategy renders each `SystemAct` in turn
     *          by calling `act.control.render(act)`. This strategy leads to
     *          prompts that are a concatenation of the prompt-fragment for each
     *          `SystemAct`.
     *
     * Usage:
     *  * In many situations rendering the acts one-by-one is sufficient as the
     *    concatenation of prompt fragments leads to usable prompts.  For
     *    example
     *
     * ```js
     *    [ValueSetAct(ageCtrl, 5), RequestValueAct(nameCtrl)]
     * ```
     *    may be rendered sequentially to produce:
     *
     * ```js
     *    -> 'OK, 5. What is your name?"
     * ```
     *
     *    * For more complex situations, override this method and implement a
     *      custom rendering strategy.  Often the solution will be to implement
     *      some special cases and otherwise fallback to the default by calling
     *      super.render() or by directly calling
     *      `ControlManager.renderActsOneByOne()`.
     *
     */
    render(
        result: ControlResult,
        input: ControlInput,
        controlResponseBuilder: ControlResponseBuilder,
    ): void | Promise<void> {
        renderActsInSequence(result.acts, input, controlResponseBuilder);
    }

    /**
     * Handles an internal error.
     *
     * This is intended for logging, reporting and perhaps mentioning the
     * situation to the user. The user session will be automatically closed.
     *
     * Default: The error object is converted into an object with enumerable
     * properties and logged at logLevel=error
     * @param input - Input
     * @param error - Error
     * @param responseBuilder - Response builder
     */
    handleInternalError(input: ControlInput, error: any, responseBuilder: ControlResponseBuilder): void {
        const err =
            error.stack !== undefined ? { name: error.name, msg: error.message, stack: error.stack } : error; // Error doesn't have enumerable properties, so we convert it.
        log.error(`Error handled: ${JSON.stringify(err)}`);
    }

    /**
     * Builds interaction model content required by the Control tree.
     *
     * Usage:
     * - The imDataMap has 'en-US' modelData registered by default
     * - The developer may configure and register additional `imDataMap`
     *   instances to support additional locales
     *
     * * If imDataMap doesn't have data for the requested locale a
     *   `LocaleNotSupportedError` will be thrown
     *
     * @param generator - Interaction Model Generator
     */
    buildInteractionModel(generator: ControlInteractionModelGenerator): void {
        const rootControl = this.createControlTree();
        const imData: ModelData = _generateModelData();
        updateIMForControlTree(rootControl, generator, imData);
    }

    /**
     * Load the control state map from durable storage.
     *
     * Default: loads from Session Attributes.
     */
    loadControlStateMap(handlerInput: HandlerInput): { [key: string]: any } {
        return ControlManager.loadControlStateMapFromSessionAttributes(
            handlerInput,
            ControlManager.DEFAULT_CONTROL_STATE_ATTRIBUTE_KEY,
        );
    }

    /**
     * Saves the control state map for use in subsequent turns of this session.
     *
     * Default: saves to the Session Attributes.
     */
    saveControlStateMap(state: any, handlerInput: HandlerInput): void {
        ControlManager.saveControlStateToSessionAttributes(
            state,
            handlerInput,
            ControlManager.DEFAULT_CONTROL_STATE_ATTRIBUTE_KEY,
        );
    }

    static saveControlStateToSessionAttributes(
        state: any,
        handlerInput: HandlerInput,
        attributeKey: string,
    ): void {
        handlerInput.attributesManager.getSessionAttributes()[attributeKey] = state;
    }

    static loadControlStateMapFromSessionAttributes(
        handlerInput: HandlerInput,
        attributeKey: string,
    ): { [key: string]: any } {
        const retrievedStateJSON = handlerInput.attributesManager.getSessionAttributes()[attributeKey];
        const stateMap = retrievedStateJSON !== undefined ? JSON.parse(retrievedStateJSON) : {};
        return stateMap;
    }
}

/**
 * Render each of the acts, one-by-one.
 *
 *
 * @param systemActs - The system acts to render
 * @param input - Input
 * @param responseBuilder - Response builder.
 */
export function renderActsInSequence(
    systemActs: SystemAct[],
    input: ControlInput,
    controlResponseBuilder: ControlResponseBuilder,
): void {
    for (const act of systemActs) {
        act.control.renderAct(act, input, controlResponseBuilder);
    }
}

/**
 * Visits every control in the tree and updates the interaction model for each
 * control. Go through the entire control tree and update IM
 * @param generator - Interaction model generator
 * @param control - Root control
 * @param imData - Localized data for use in interaction model
 */
function updateIMForControlTree(
    control: IControl,
    generator: ControlInteractionModelGenerator,
    imData: ModelData,
): void {
    if (control instanceof Control && implementsInteractionModelContributor(control)) {
        control.updateInteractionModel(generator, imData);
        const targetIds: string[] | undefined = control.getTargetIds();
        if (targetIds !== undefined) {
            targetIds.forEach((targetId) => {
                generator.targetSlotIds = generator.targetSlotIds.add(targetId);
            });
        }
    }

    // If container control, do same thing recursively
    if (isContainerControl(control)) {
        for (const child of control.children) {
            updateIMForControlTree(child, generator, imData);
        }
    }
}

/**
 * Initializes the internationalization system (i18next).
 *
 * This loads data for the specified local from the resources.
 *
 * @param locale - The locale to specialize to.
 * @param resources - Resources for all supported locales.
 */
function i18nInit(locale: string, resources: Resource): void {
    if (!locale) {
        throw new Error('Please specify the language.');
    }
    void i18next.init({
        lng: locale,
        resources,
        fallbackLng: 'en',
    });
}
