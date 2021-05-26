import { SkillBuilders } from 'ask-sdk-core';
import Debug from 'debug';
import { DefaultLogger } from '../../../../src';
import { NumberControl } from '../../../../src/commonControls/numberControl/NumberControl';
import { Control } from '../../../../src/controls/Control';
import { ControlManager } from '../../../../src/controls/ControlManager';
import { ControlServices } from '../../../../src/controls/ControlServices';
import { ILogger } from '../../../../src/controls/interfaces/ILogger';
import { ILoggerFactory } from '../../../../src/controls/interfaces/ILoggerFactory';
import { ControlHandler } from '../../../../src/runtime/ControlHandler';
import { DemoRootControl } from '../../../Common/src/DemoRootControl';

export class CustomLoggerFactory implements ILoggerFactory {
    getLogger(namespace: string): ILogger {
        return new CustomLogger(namespace);
    }
}

export class CustomLogger extends DefaultLogger {
    info(message: string): void {
        Debug(`info:CustomLogger:${this.moduleName}`)(message);
    }

    sanitize(message: any): string {
        if (
            process.env.ASK_SDK_RESTRICTIVE_LOGGING !== undefined &&
            process.env.ASK_SDK_RESTRICTIVE_LOGGING === 'true'
        ) {
            return '###################';
        } else {
            return message;
        }
    }
}

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
                    apl: {
                        validationFailedMessage: (value) =>
                            `Sorry, ${value} is not valid, value must be even`,
                    },
                }),
            );
            return rootControl;
        }
    }
}

const services = { logger: new CustomLoggerFactory() };
ControlServices.setDefaults(services);

export const handler = SkillBuilders.custom()
    .addRequestHandlers(new ControlHandler(new BasicNumberDemo.DemoControlManager()))
    .lambda();
