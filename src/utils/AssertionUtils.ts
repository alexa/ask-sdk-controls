/**
 * Assertion, with Typescript 3.7 asserts to convey the information to compiler.
 * @param condition - condition
 * @param message - message
 */
export function assert(condition: boolean, message?: string): asserts condition {
    if (!condition) {
        throw new Error(message !== undefined ? `Assertion failed. ${message}` : 'Assertion failed');
    }
    return;
}
