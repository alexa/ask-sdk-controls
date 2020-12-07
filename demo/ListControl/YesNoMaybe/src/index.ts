import { SkillBuilders } from 'ask-sdk-core';
import { AmazonBuiltInSlotType, Strings } from '../../../../src';
import { ListControl } from '../../../../src/commonControls/listControl/ListControl';
import { Control } from '../../../../src/controls/Control';
import { ControlManager } from '../../../../src/controls/ControlManager';
import { ControlHandler } from '../../../../src/runtime/ControlHandler';
import { defaultIntentToValueMapper  } from '../../../../src/utils/IntentUtils';
import { DemoRootControl } from '../../../Common/src/DemoRootControl';
import { filteredYesNoMaybeSlotType, yesNoMaybeSlotType } from './interactionModelTypes';


/**
 * Simple demonstration of a list control.
 *
 *  root [RootControl]
 *    - ListControl
 */
export namespace ListDemo1 {
    export class DemoControlManager extends ControlManager {
        createControlTree(): Control {
            const rootControl = new DemoRootControl({ id: 'root' });
            rootControl.addChild(
                new ListControl({
                    id: 'question',
                    listItemIDs: ['yes', 'no', 'maybe'],
                    slotType: yesNoMaybeSlotType.name!,
                    confirmationRequired: true,
                    interactionModel: {
                        targets: [Strings.Target.It, Strings.Target.Choice],
                        slotValueConflictExtensions: {
                            filteredSlotType: filteredYesNoMaybeSlotType.name!,
                            intentToValueMapper: (intent) => defaultIntentToValueMapper(intent),
                        },
                    },
                    prompts: {
                        valueSet: '',  // TODO: if confirmation required, this should probably default to ''. Possible??
                    },
                }),
            );

            return rootControl;
        }
    }
}

export const handler = SkillBuilders.custom()
        .addRequestHandlers(new ControlHandler(new ListDemo1.DemoControlManager()))
        .lambda();
