# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.5.0](https://github.com/alexa/ask-sdk-controls/compare/v0.4.0...v0.5.0) (2021-01-19)


### ⚠ BREAKING CHANGES

*  - change to interaction model building flow. (controls must be added after custom content)
 - various additions and minor changes to built-in interaction model content

Squashed commit of the following:

commit d744f6ca02c351ec6da651a94d98c502920c9375
Author: mliddell <mliddell@amazon.com>
Date:   Sun Dec 6 18:14:47 2020 -0800

    cleanup, export new publics

commit 0dad51a1ceab2a0747e392b55bab61f1793d6574
Author: mliddell <mliddell@amazon.com>
Date:   Sun Dec 6 17:41:36 2020 -0800

    i18n strings, put response logging behind env-var

commit b019371beb68cecf348aee716be6fc8aaafe7828
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 18:16:30 2020 -0800

    fix: fix lint warnings

commit 218aec5b66d2f0248fa96047a9bb3e23257011e2
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 18:12:06 2020 -0800

    chore: force upgrade highlight.js

commit 13108790b8c7a46f2a80f803b021dbcc2251b8d5
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 18:01:19 2020 -0800

    added some todos

commit 3103314104e19be5feb3dc336675c7a1eaa5f2d8
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 17:48:59 2020 -0800

    fix formatting

commit 3122b010a90e58dcab12ee79537fa7f96bd67936
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 17:48:09 2020 -0800

    reorganize and simplify how interaction-model build works

commit 7375763d8c171e4c3ba7df5d9c049d64e85c7a9d
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 13:53:01 2020 -0800

    all tests passing

commit c2d4670c4d284bbeecceca167df503ac5d7e0450
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 13:47:56 2020 -0800

    visualLabel and tests for touch input

commit 5d6634a2cd619fce5e29cb113667486ad82b8990
Author: mliddell <mliddell@amazon.com>
Date:   Wed Dec 2 19:08:36 2020 -0800

    Generally working

commit 6f7613de1edd81df0b1fa5ad3c5047a8916554c1
Author: mliddell <mliddell@amazon.com>
Date:   Wed Dec 2 10:55:01 2020 -0800

    wip

commit 2a68f2513e50e64b88ee3af24b5998bb94ab39ca
Author: mliddell <mliddell@amazon.com>
Date:   Tue Nov 24 18:16:56 2020 -0800

    wip

commit 2bcdeaf696870d554ef5a52a5c8a33f172e90c2c
Author: mliddell <mliddell@amazon.com>
Date:   Fri Nov 20 14:21:50 2020 -0800

    wip

commit 3becee386b499b7448df45ce8589530a0db9a6de
Author: mliddell <mliddell@amazon.com>
Date:   Tue Nov 3 16:46:54 2020 -0800

    feat: add QuestionnaireControl (basic facilities)

    QuestionnaireControl presents a series of questions to the user
    - each question must have the same set of allowed answers
    - intended to reduce friction by allowing fast data-entry and
      better user initiative to move between questions & be done with
      only partial input.

    This control is still in design/development.

    Squashed commit of the following:

    commit a65e4508130bbf364b4657a869500bba03e3104b
    Author: mliddell <mliddell@amazon.com>
    Date:   Tue Nov 3 16:38:14 2020 -0800

        wip: fix formatting

    commit fa97a216fbd1b5c7e450527a1198fa4a3bdfa084
    Author: mliddell <mliddell@amazon.com>
    Date:   Tue Nov 3 16:37:01 2020 -0800

        wip: Added tests for Questionnaire. Improved async usage in other controls.

    commit 9af6b35a535095406731116c1f0143e8a5061cd2
    Merge: ad07cfb bbcd95e
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Nov 1 14:01:43 2020 -0800

        wip: merged and continuiing...

    commit ad07cfb6a247be34c8c390b651f7acff5ee0499a
    Author: mliddell <mliddell@amazon.com>
    Date:   Fri Oct 30 14:21:47 2020 -0700

        wip: adding question-asking initiative

    commit 76f39ffcf85f9731da5272e8ed7467d5e423ae90
    Author: mliddell <mliddell@amazon.com>
    Date:   Mon Oct 26 16:29:30 2020 -0700

        wip Demo with three columns, improved APL formatting

    commit a714dbe0b6c89c89f691fb4c3a625246d179b637
    Author: mliddell <mliddell@amazon.com>
    Date:   Mon Oct 26 16:07:51 2020 -0700

        wip - APL improved

    commit 3c71204eb768624acd805760ba1a09aa5c14c319
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Oct 25 18:02:02 2020 -0700

        wip: general updates. auto-scrolling

    commit e1d4439164e2b4be774430e91fe55132b936db9f
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Oct 25 16:51:02 2020 -0700

        wip: basic question prompts & value answers

    commit 13277043d5146695fcbfa49aca8e26f992a92a74
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Oct 25 14:30:27 2020 -0700

        wip: basic apl touch-selection wired up

    commit a42dc2bdd448d9b25fdf8b19a42ff5a770d87808
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Oct 25 13:06:04 2020 -0700

        wip: simplified questionnaire content props

    commit 4b93fac681de2a532bc2ca7eee797dc5208f4f76
    Author: mliddell <mliddell@amazon.com>
    Date:   Fri Oct 23 10:27:33 2020 -0700

        wip

    commit 68beedda18617bbe40df62b7e1891d40591d44f7
    Author: mliddell <mliddell@amazon.com>
    Date:   Tue Oct 20 11:01:37 2020 -0700

        chore_(.commitrc): change 'docs' to 'doc'

    commit a02210f2b06087708789a15bdb37d2f15490dd6a
    Author: mliddell <mliddell@amazon.com>
    Date:   Tue Oct 20 11:00:20 2020 -0700

        docs_: jsDoc for ControlManagerProps

    commit 37f31ba14828e20f39f34c1cc81d67318630267a
    Author: mliddell <mliddell@amazon.com>
    Date:   Tue Oct 20 09:23:03 2020 -0700

        wip

    commit b71b8ad1d91a41e40b821a1c38dd063661bd1dd7
    Author: mliddell <mliddell@amazon.com>
    Date:   Mon Oct 19 18:06:31 2020 -0700

        checkpoint before rework of userActs to handleFuncs

    commit 2e0ff3969ee824c19fc30f85baef3adb53d0a250
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Oct 18 17:10:32 2020 -0700

        wip_: progress on QuestionnaireControl

    commit c06056131c67fb384b61c83b7cb11513c6b7dae0
    Author: mliddell <mliddell@amazon.com>
    Date:   Sat Oct 17 17:58:07 2020 -0700

        wip_: getting started with QuestionnaireControl

    commit 2914843849f2dfb3f637f20210c14b9f6bee8ea4
    Author: mliddell <mliddell@amazon.com>
    Date:   Sat Oct 17 12:33:34 2020 -0700

        wip: starting questionnaire

    commit 25e298610f0ddf76149af1ce34a426192e4cc0e4
    Author: mliddell <mliddell@amazon.com>
    Date:   Wed Oct 14 13:31:16 2020 -0700

        feat: a simple demo skill using multiple lists
*  - change to interaction model building flow. (controls must be added after custom content)
 - various additions and minor changes to built-in interaction model content

Squashed commit of the following:

commit d744f6ca02c351ec6da651a94d98c502920c9375
Author: mliddell <mliddell@amazon.com>
Date:   Sun Dec 6 18:14:47 2020 -0800

    cleanup, export new publics

commit 0dad51a1ceab2a0747e392b55bab61f1793d6574
Author: mliddell <mliddell@amazon.com>
Date:   Sun Dec 6 17:41:36 2020 -0800

    i18n strings, put response logging behind env-var

commit b019371beb68cecf348aee716be6fc8aaafe7828
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 18:16:30 2020 -0800

    fix: fix lint warnings

commit 218aec5b66d2f0248fa96047a9bb3e23257011e2
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 18:12:06 2020 -0800

    chore: force upgrade highlight.js

commit 13108790b8c7a46f2a80f803b021dbcc2251b8d5
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 18:01:19 2020 -0800

    added some todos

commit 3103314104e19be5feb3dc336675c7a1eaa5f2d8
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 17:48:59 2020 -0800

    fix formatting

commit 3122b010a90e58dcab12ee79537fa7f96bd67936
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 17:48:09 2020 -0800

    reorganize and simplify how interaction-model build works

commit 7375763d8c171e4c3ba7df5d9c049d64e85c7a9d
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 13:53:01 2020 -0800

    all tests passing

commit c2d4670c4d284bbeecceca167df503ac5d7e0450
Author: mliddell <mliddell@amazon.com>
Date:   Sat Dec 5 13:47:56 2020 -0800

    visualLabel and tests for touch input

commit 5d6634a2cd619fce5e29cb113667486ad82b8990
Author: mliddell <mliddell@amazon.com>
Date:   Wed Dec 2 19:08:36 2020 -0800

    Generally working

commit 6f7613de1edd81df0b1fa5ad3c5047a8916554c1
Author: mliddell <mliddell@amazon.com>
Date:   Wed Dec 2 10:55:01 2020 -0800

    wip

commit 2a68f2513e50e64b88ee3af24b5998bb94ab39ca
Author: mliddell <mliddell@amazon.com>
Date:   Tue Nov 24 18:16:56 2020 -0800

    wip

commit 2bcdeaf696870d554ef5a52a5c8a33f172e90c2c
Author: mliddell <mliddell@amazon.com>
Date:   Fri Nov 20 14:21:50 2020 -0800

    wip

commit 3becee386b499b7448df45ce8589530a0db9a6de
Author: mliddell <mliddell@amazon.com>
Date:   Tue Nov 3 16:46:54 2020 -0800

    feat: add QuestionnaireControl (basic facilities)

    QuestionnaireControl presents a series of questions to the user
    - each question must have the same set of allowed answers
    - intended to reduce friction by allowing fast data-entry and
      better user initiative to move between questions & be done with
      only partial input.

    This control is still in design/development.

    Squashed commit of the following:

    commit a65e4508130bbf364b4657a869500bba03e3104b
    Author: mliddell <mliddell@amazon.com>
    Date:   Tue Nov 3 16:38:14 2020 -0800

        wip: fix formatting

    commit fa97a216fbd1b5c7e450527a1198fa4a3bdfa084
    Author: mliddell <mliddell@amazon.com>
    Date:   Tue Nov 3 16:37:01 2020 -0800

        wip: Added tests for Questionnaire. Improved async usage in other controls.

    commit 9af6b35a535095406731116c1f0143e8a5061cd2
    Merge: ad07cfb bbcd95e
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Nov 1 14:01:43 2020 -0800

        wip: merged and continuiing...

    commit ad07cfb6a247be34c8c390b651f7acff5ee0499a
    Author: mliddell <mliddell@amazon.com>
    Date:   Fri Oct 30 14:21:47 2020 -0700

        wip: adding question-asking initiative

    commit 76f39ffcf85f9731da5272e8ed7467d5e423ae90
    Author: mliddell <mliddell@amazon.com>
    Date:   Mon Oct 26 16:29:30 2020 -0700

        wip Demo with three columns, improved APL formatting

    commit a714dbe0b6c89c89f691fb4c3a625246d179b637
    Author: mliddell <mliddell@amazon.com>
    Date:   Mon Oct 26 16:07:51 2020 -0700

        wip - APL improved

    commit 3c71204eb768624acd805760ba1a09aa5c14c319
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Oct 25 18:02:02 2020 -0700

        wip: general updates. auto-scrolling

    commit e1d4439164e2b4be774430e91fe55132b936db9f
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Oct 25 16:51:02 2020 -0700

        wip: basic question prompts & value answers

    commit 13277043d5146695fcbfa49aca8e26f992a92a74
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Oct 25 14:30:27 2020 -0700

        wip: basic apl touch-selection wired up

    commit a42dc2bdd448d9b25fdf8b19a42ff5a770d87808
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Oct 25 13:06:04 2020 -0700

        wip: simplified questionnaire content props

    commit 4b93fac681de2a532bc2ca7eee797dc5208f4f76
    Author: mliddell <mliddell@amazon.com>
    Date:   Fri Oct 23 10:27:33 2020 -0700

        wip

    commit 68beedda18617bbe40df62b7e1891d40591d44f7
    Author: mliddell <mliddell@amazon.com>
    Date:   Tue Oct 20 11:01:37 2020 -0700

        chore_(.commitrc): change 'docs' to 'doc'

    commit a02210f2b06087708789a15bdb37d2f15490dd6a
    Author: mliddell <mliddell@amazon.com>
    Date:   Tue Oct 20 11:00:20 2020 -0700

        docs_: jsDoc for ControlManagerProps

    commit 37f31ba14828e20f39f34c1cc81d67318630267a
    Author: mliddell <mliddell@amazon.com>
    Date:   Tue Oct 20 09:23:03 2020 -0700

        wip

    commit b71b8ad1d91a41e40b821a1c38dd063661bd1dd7
    Author: mliddell <mliddell@amazon.com>
    Date:   Mon Oct 19 18:06:31 2020 -0700

        checkpoint before rework of userActs to handleFuncs

    commit 2e0ff3969ee824c19fc30f85baef3adb53d0a250
    Author: mliddell <mliddell@amazon.com>
    Date:   Sun Oct 18 17:10:32 2020 -0700

        wip_: progress on QuestionnaireControl

    commit c06056131c67fb384b61c83b7cb11513c6b7dae0
    Author: mliddell <mliddell@amazon.com>
    Date:   Sat Oct 17 17:58:07 2020 -0700

        wip_: getting started with QuestionnaireControl

    commit 2914843849f2dfb3f637f20210c14b9f6bee8ea4
    Author: mliddell <mliddell@amazon.com>
    Date:   Sat Oct 17 12:33:34 2020 -0700

        wip: starting questionnaire

    commit 25e298610f0ddf76149af1ce34a426192e4cc0e4
    Author: mliddell <mliddell@amazon.com>
    Date:   Wed Oct 14 13:31:16 2020 -0700

        feat: a simple demo skill using multiple lists

### Features

* **MultiValueList:** added multiValueListControl and its default APL ([59f970f](https://github.com/alexa/ask-sdk-controls/commit/59f970f207e80bac49e80d38ca76281f9799a6cb))
* add APL for NumberControl ([831cc83](https://github.com/alexa/ask-sdk-controls/commit/831cc83df63665742daf612c9f12f081326a03dc))
* async load/save of control state ([c492307](https://github.com/alexa/ask-sdk-controls/commit/c492307473f70895c33f6fd04e412efb5a7cb63d))
* **questionnaire:** improve APL behavior ([759719e](https://github.com/alexa/ask-sdk-controls/commit/759719e50a304a4265930404f1c4af98475a1ef1))
* add QuestionnaireControl (multiple yes/no questions) ([65ed192](https://github.com/alexa/ask-sdk-controls/commit/65ed192f712e569d54f84deede7b5808f429e188))
* add QuestionnaireControl (multiple yes/no questions) ([dec8b04](https://github.com/alexa/ask-sdk-controls/commit/dec8b0494f4c036eb39a28a1de0a03f20e4ba680))


### Bug Fixes

* **ValueControl:** fix slot elicitation directive ([da5ff3c](https://github.com/alexa/ask-sdk-controls/commit/da5ff3c44332457e870cf6480221e9a4aabe4a38))
* change number control validationFailedMessage type to be consistent with state.value ([d507925](https://github.com/alexa/ask-sdk-controls/commit/d50792586f3c638261dab5fabb413406dc13049c))
* cleanup and fixes for PR comments ([a23520b](https://github.com/alexa/ask-sdk-controls/commit/a23520bec51ed82fbe5fbb4a7ab84c355f5cccbb))
* **ListControl:** allow filteredSlotType to be 'none' ([aedaa42](https://github.com/alexa/ask-sdk-controls/commit/aedaa423242d8362e2d93b6bff21ba5d837324be))
* fixes from PR comments [#35](https://github.com/alexa/ask-sdk-controls/issues/35) ([159cf5b](https://github.com/alexa/ask-sdk-controls/commit/159cf5b5a4d859eee9a64c1b366191abf592e033))
* use 'idleMode' after touch. fixes for PR comments. general cleanup ([323a25f](https://github.com/alexa/ask-sdk-controls/commit/323a25f8500aa66d27699ed63fda8b121da672d2))
* use 'idleMode' after touch. fixes for PR comments. general cleanup ([7c776fb](https://github.com/alexa/ask-sdk-controls/commit/7c776fbccc9b2d34dbcfafb8027773fd97d1f30a))

## [0.4.0](https://github.com/alexa/ask-sdk-controls/compare/v0.3.0...v0.4.0) (2020-11-23)


### ⚠ BREAKING CHANGES

* change to IControlManager.reestablishControlStates signature
* minor changes to exported functions and names
* validation function types altered.

### Features

* clean up package exports ([9fbc6da](https://github.com/alexa/ask-sdk-controls/commit/9fbc6dad10130c6dfe282573742d0589a397df88))


### Bug Fixes

* improve robustness of serializationValidator ([d9db314](https://github.com/alexa/ask-sdk-controls/commit/d9db314b7a8c036fbba3c9f55789e0f29ea4722b))
* improves validations API ([1209f23](https://github.com/alexa/ask-sdk-controls/commit/1209f23048c68b7bf95c7ad058ad8322af001190))
* no longer invoke controlManager.loadState/saveState in SerializationValidator ([03afb43](https://github.com/alexa/ask-sdk-controls/commit/03afb43b52f7e171719cc5c2489713096414a673))


### Docs

* improve the jsDocs regarding Control.isReady and Control.canTakeInitiative ([6216dcd](https://github.com/alexa/ask-sdk-controls/commit/6216dcda27fe720b82f8abfb4c9a45106b11ead0))

## [0.3.0](https://github.com/alexa/ask-sdk-controls/compare/v0.2.4...v0.3.0) (2020-10-21)


### ⚠ BREAKING CHANGES

* - (minor) ControlManager.createControlTree(). Removed controlStateBag parameter
- (minor) renamed LanguageStrings.systemResources to defaultI18nResources

### Features

* add DynamicContainerControl ([656eb37](https://github.com/alexa/ask-sdk-controls/commit/656eb37cb7d22291db0b6509008a5cf0195e99f6))
* added support for custom handler functions in commonControls ([6ab3414](https://github.com/alexa/ask-sdk-controls/commit/6ab3414219be9209379e70c0394848fd1ce65b03))
* added valueRenderer prop[map (id) => rendered string] and renderedValue property in act payloads which are defaults to be used on prompts on all commonControls ([81a01cb](https://github.com/alexa/ask-sdk-controls/commit/81a01cbb89003f88d8684e8752508c569ee05b96))
* adds ListControl / Builtin-intent compatability ([a3b7dd0](https://github.com/alexa/ask-sdk-controls/commit/a3b7dd0f36eba7c08e6f24b50c180ca431b9ed85))
* generalized APL support along with built-ins ([627e080](https://github.com/alexa/ask-sdk-controls/commit/627e0809237ee1a3b08c7272e30e4653a8ffad44))
* improve control tree building API ([9a2e1d9](https://github.com/alexa/ask-sdk-controls/commit/9a2e1d9ff49a24ef43eefab47b939ab7c5699173))
* support 'modelConfiguration' in interactionModelGenerator ([d01aa85](https://github.com/alexa/ask-sdk-controls/commit/d01aa85c1a56ffe69f89b012129fe62d7878c224))


### Docs

* add instructions/tips for writing user guide content ([aceeea8](https://github.com/alexa/ask-sdk-controls/commit/aceeea820eda8ceec42eb81b56061629a3f01047))
* add instructions/tips for writing user guide content ([9199b68](https://github.com/alexa/ask-sdk-controls/commit/9199b686f253b3e794408d052a56c463967e7fac))
* improve 'interaction model' section ([274f80d](https://github.com/alexa/ask-sdk-controls/commit/274f80d2dbc92ecf32e7595cf221c1d7f1773f62))
* improve 'interaction model' section ([b9438a3](https://github.com/alexa/ask-sdk-controls/commit/b9438a3ccddeb08e53a0d40c0d541769bec97526))

### [0.2.4](https://github.com/alexa/ask-sdk-controls/compare/v0.2.3...v0.2.4) (2020-09-11)

### [0.2.3](https://github.com/alexa/ask-sdk-controls/compare/v0.2.2...v0.2.3) (2020-09-11)

### 0.2.2 (2020-09-10)

# 0.2.1 (2020-07-21)

This release contains the following changes : 

- Add chai as runtime dependency.
- Add the Changelog.

# 0.2.0 (2020-07-21)

This release contains the following changes : 

- Initial release for ask-sdk-controls for ASK SDK for Node.js.
