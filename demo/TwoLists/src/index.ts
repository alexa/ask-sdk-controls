import { SkillBuilders } from 'ask-sdk-core';
import { Control } from '../../..//src/controls/Control';
import { ListControl } from '../../../src/commonControls/listControl/ListControl';
import { Strings } from '../../../src/constants/Strings';
import { ControlManager } from '../../../src/controls/ControlManager';
import { ControlHandler } from '../../../src/runtime/ControlHandler';
import { DemoRootControl } from '../../Common/src/DemoRootControl';

export namespace MultipleLists {
    const breedControl = new ListControl({
        id: 'breed',
        listItemIDs: ['labrador', 'persian'],
        slotType: 'PetBreed',
    });

    export class DemoControlManager extends ControlManager {

        createControlTree(): Control {
            const rootControl = new DemoRootControl({ id: 'root' });

            rootControl.addChild(
                new ListControl({
                    id: 'species',
                    listItemIDs: ['cat', 'dog', 'rabbit'],
                    slotType: 'PetSpecies',
                    interactionModel: {
                        targets: [Strings.Target.It, 'species', 'petKind'],
                    },
                    confirmationRequired: function(this:ListControl){return this.state.value === 'rabbit'}
                }),
            );

            rootControl.addChild(breedControl);

            rootControl.addChild(
                new ListControl({
                    id: 'transactionType',
                    listItemIDs: ['adopt', 'foster', 'sponsor'],
                    slotType: 'TransactionType',
                }),
            );

            return rootControl;
        }
    }
}

export const handler = SkillBuilders.custom()
    .addRequestHandlers(new ControlHandler(new MultipleLists.DemoControlManager()))
    .lambda();
