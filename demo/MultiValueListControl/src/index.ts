import { SkillBuilders } from 'ask-sdk-core';
import { Control } from '../../..//src/controls/Control';
import {
    MultiValueListControl,
    MultiValueListStateValue,
    MultiValueValidationFailure,
} from '../../../src/commonControls/multiValueListControl/MultiValueListControl';
import { ControlManager } from '../../../src/controls/ControlManager';
import { ControlHandler } from '../../../src/runtime/ControlHandler';
import { DemoRootControl } from '../../Common/src/DemoRootControl';

export namespace MultiValueListDemo {
    export class DemoControlManager extends ControlManager {
        createControlTree(): Control {
            const rootControl = new DemoRootControl({ id: 'root' });

            rootControl.addChild(
                new MultiValueListControl({
                    id: 'myShoppingList',
                    validation: validateItems,
                    listItemIDs: getShoppingList,
                    slotType: 'GroceryItem',
                    confirmationRequired: true,
                    prompts: {
                        confirmValue: 'Is that all?',
                    },
                }),
            );

            function getShoppingList() {
                return ['Milk', 'Eggs', 'Cereal', 'Bread'];
            }

            function validateItems(values: MultiValueListStateValue[]): true | MultiValueValidationFailure {
                const invalidValues = [];
                for (const item of values) {
                    if (getShoppingList().includes(item.id) !== true) {
                        invalidValues.push(item.id);
                    }
                }
                if (invalidValues.length > 0) {
                    return {
                        invalidValues,
                        renderedReason: 'item is not available in the shopping list',
                    };
                }
                return true;
            }

            return rootControl;
        }
    }
}

export const handler = SkillBuilders.custom()
    .addRequestHandlers(new ControlHandler(new MultiValueListDemo.DemoControlManager()))
    .lambda();
