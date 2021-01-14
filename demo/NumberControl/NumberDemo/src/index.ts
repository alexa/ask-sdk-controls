import { SkillBuilders } from 'ask-sdk-core';
import { NumberControl } from '../../../../src/commonControls/numberControl/NumberControl';
import { Control } from '../../../../src/controls/Control';
import { ControlManager } from '../../../../src/controls/ControlManager';
import { ControlHandler } from '../../../../src/runtime/ControlHandler';
import { DemoRootControl } from '../../../Common/src/DemoRootControl';

/**
 * Simple demonstration of a number control.
 *
 *  root [RootControl]
 *    - NumberControl
 */
export namespace BasicNumberDemo {
    export class DemoControlManager extends ControlManager {
        createControlTree(): Control {
            const rootControl = new DemoRootControl({ id: 'root' });
            rootControl.addChild(
                new NumberControl({
                    id: 'number',
                    confirmationRequired: true,
                    validation: [
                        (state) => state.value! % 2 === 0 || { renderedReason: 'the value must be even' },
                    ],
                }),
            );
            return rootControl;
        }
    }
}

export const handler = SkillBuilders.custom()
    .addRequestHandlers(new ControlHandler(new BasicNumberDemo.DemoControlManager()))
    .lambda();
