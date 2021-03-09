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

export namespace TestStrings {
    export enum SlotType {
        DomainValue = 'DomainValue',
    }

    export enum Target {
        Name = 'name',
        FirstName = 'firstName',
        LastName = 'lastName',
        AvatarName = 'avatarName',
        PetName = 'petName',
        Age = 'age',
        CharClass = 'class',
        Species = 'species',
    }

    export enum ID {
        GameContainer = 'gameContainer',

        PlayerContainer = 'playerContainer',
        PlayerName = 'playerName',
        PlayerAge = 'playerAge',
        PlayerClass = 'playerClass',

        PetContainer = 'petContainer',
        PetName = 'petName',
        PetSpecies = 'petSpecies',

        FirstName = 'firstName',
        LastName = 'lastName'
    }

    export enum Value {
        Elf = 'elf',
        Dwarf = 'dwarf',
        Human = 'human',
        Cat = 'cat',
        Dog = 'dog',
    }
}
