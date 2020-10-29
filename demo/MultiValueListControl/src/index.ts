import { SkillBuilders } from 'ask-sdk-core';
import { Control } from '../../..//src/controls/Control';
import { MultiValueListControl, MultiValueListStateValue, MultiValueValidationFailure } from '../../../src/commonControls/multiValueListControl/MultiValueListControl';
import { ControlManager } from '../../../src/controls/ControlManager';
import { ControlHandler } from '../../../src/runtime/ControlHandler';
import { DemoRootControl } from '../../Common/src/DemoRootControl';

export namespace MultiValueListDemo {
    export class DemoControlManager extends ControlManager {
        createControlTree(): Control {
            const rootControl = new DemoRootControl({ id: 'root' });

            rootControl.addChild(
                new MultiValueListControl({
                    id: 'apple',
                    validation: validateProducts,
                    listItemIDs: getProductList,
                    slotType: 'AppleSuite',
                    confirmationRequired: true,
                    prompts: {
                        confirmValue: 'Is that all?',
                    },
                }),
            );

            function getProductList() {
                return ['AirPods', 'iWatch', 'iPhone', 'iPad', 'MacBook'];
            }

            function validateProducts(values: MultiValueListStateValue[]): true | MultiValueValidationFailure {
                const invalidValues = [];
                for (const product of values) {
                    if (getProductList().includes(product.id) !== true) {
                        invalidValues.push(product.id);
                    }
                }
                if (invalidValues.length > 0) {
                    return {
                        invalidValues,
                        renderedReason: 'item is not available in the product list',
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
