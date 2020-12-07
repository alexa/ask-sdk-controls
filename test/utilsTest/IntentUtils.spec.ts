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

import { expect } from 'chai';
import { suite, test } from 'mocha';
import { defaultIntentToValueMapper, IntentBuilder } from '../../src/utils/IntentUtils';

suite('== IntentUtils.IntentNameToValueMapper ==', () => {
    test("WeatherIntent -> 'weather'", async () => {
        expect('weather').equal(defaultIntentToValueMapper(IntentBuilder.of('weatherIntent')));
    });

    test("GetWeatherIntent -> 'getWeather'", async () => {
        expect('getWeather').equal(defaultIntentToValueMapper(IntentBuilder.of('GetWeatherIntent')));
    });

    test("AMAZON.YesIntent -> 'yes'", async () => {
        expect('yes').equal(defaultIntentToValueMapper(IntentBuilder.of('AMAZON.YesIntent')));
    });

    test("AMAZON.ShuffleOffIntent -> 'shuffleOff'", async () => {
        expect('shuffleOff').equal(defaultIntentToValueMapper(IntentBuilder.of('AMAZON.ShuffleOffIntent')));
    });

    test("Namespace1.namespace2.ThingIntent -> 'thing'", async () => {
        expect('thing').equal(
            defaultIntentToValueMapper(IntentBuilder.of('Namespace1.namespace2.ThingIntent')),
        );
    });

    test("SomethingRandom -> 'somethingRandom'", async () => {
        expect('somethingRandom').equal(defaultIntentToValueMapper(IntentBuilder.of('SomethingRandom')));
    });

    test('weatherIntent -> weather', async () => {
        expect('weather').equal(defaultIntentToValueMapper(IntentBuilder.of('weatherIntent')));
    });
});
