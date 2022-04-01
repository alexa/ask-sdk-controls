# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.9.2](https://github.com/alexa/ask-sdk-controls/compare/v0.9.1...v0.9.2) (2022-04-01)

### [0.9.1](https://github.com/alexa/ask-sdk-controls/compare/v0.9.0...v0.9.1) (2022-04-01)


### Bug Fixes

* Add addExperimentTrigger method to ControlResponseBuilder ([cbafd13](https://github.com/alexa/ask-sdk-controls/commit/cbafd134b79f9028afec65040fd3e804e1586fdb))
* incorrect reprompt chosen based on act ([6281838](https://github.com/alexa/ask-sdk-controls/commit/6281838c5bdf2ca41ecc9b039ba77ba81d20e2ac))
* update ask-sdk-core versions and fix vulnerabilities ([124ec2c](https://github.com/alexa/ask-sdk-controls/commit/124ec2c705ddf34473567f1a9f7222ac306e3214))

## [0.9.0](https://github.com/alexa/ask-sdk-controls/compare/v0.8.0...v0.9.0) (2021-12-16)


### Bug Fixes

* adding missing exports ([a5f8c0b](https://github.com/alexa/ask-sdk-controls/commit/a5f8c0bb6e169c7b3443e76420b269cff8451d93))
* elicit preposition slot ([3a724c0](https://github.com/alexa/ask-sdk-controls/commit/3a724c06511163df8126e8177cc8c2acd6fa570e))
* modifying session behavior to enter idle state for screen output modality, exporting modality-related functions, and adding modifying default modality evaluators to correctly classify VectorGraphic and EditText touch events ([7ca6d0b](https://github.com/alexa/ask-sdk-controls/commit/7ca6d0b5d9a0dd51d57246ae72152f038c5a42c6))

## [0.8.0](https://github.com/alexa/ask-sdk-controls/compare/v0.7.0...v0.8.0) (2021-08-31)


### ⚠ BREAKING CHANGES

* Default Act rendering will no longer include voice prompts if the request input modality is from a touch event.

### Features

* introduce functionality to determine request input modality and preferred response style. Adds utility to add appropriate prompts based on preferred response style. Modifies Act render methods and Control renderAct methods to use this utility ([92a39d2](https://github.com/alexa/ask-sdk-controls/commit/92a39d230116a78c9d5c7970d828cffc31d61288))


### Docs

* Adding documentation for new functions in ResponseUtils ([7afc8a8](https://github.com/alexa/ask-sdk-controls/commit/7afc8a8b7949fa841b06e644af32f7676ca2f300))
* fixed doc param lint issues ([90f0f76](https://github.com/alexa/ask-sdk-controls/commit/90f0f76373888bc90816c539887b1ae6b54bc2a6))

## [0.7.0](https://github.com/alexa/ask-sdk-controls/compare/v0.6.3...v0.7.0) (2021-08-20)


### Features

* Add support for CanFulfillIntentRequest ([7587a46](https://github.com/alexa/ask-sdk-controls/commit/7587a460702a03dc8ccbb8dafb03f7635c9bb557))

### [0.6.3](https://github.com/alexa/ask-sdk-controls/compare/v0.6.2...v0.6.3) (2021-08-03)


### Bug Fixes

* exported i18Init function on ControlManager ([60897e3](https://github.com/alexa/ask-sdk-controls/commit/60897e3d358ae6c5dcff75f4bf9e030c1e9d44f1))

### [0.6.2](https://github.com/alexa/ask-sdk-controls/compare/v0.6.1...v0.6.2) (2021-07-29)


### Features

* Adding Directive support for RePrompt SPI ([550ca98](https://github.com/alexa/ask-sdk-controls/commit/550ca981dc1b30087ed7169aa75cd99887ca516e))

### [0.6.1](https://github.com/alexa/ask-sdk-controls/compare/v0.6.0...v0.6.1) (2021-06-24)


### ⚠ BREAKING CHANGES

* Whenever a request is processed by a Control and evaluated with its defined handlers, if more than one handler matches are found, control throws an error with matching handlers.
* **NumberControl:** Renamed NumberControlProp `ambiguousPairs` to `mostLikelyMisunderstanding`.
Changed default prompts on NumberControl actions such as valueChanged, valueCleared.
* converted `Control.renderAct()` function to async type and its
                 return type to  Promise<void> and `renderAPLComponent` function to async
                 and its return type to Promise<{[key:string]: any}> to support asynchronous functionalities

### Features

* builtin APL support for both blocking and non-blocking UI ([0c42a6d](https://github.com/alexa/ask-sdk-controls/commit/0c42a6d92068442f06f71ab15fc91b01f4f1332d))
* Introduced restrictive logging of sensitive data and configuration of logging output ([56f78cf](https://github.com/alexa/ask-sdk-controls/commit/56f78cf5dedae9ac08b6c5485ef421732ebec917))
* refactored NumberControl and its APL Components ([46f2e7d](https://github.com/alexa/ask-sdk-controls/commit/46f2e7d683b6e83c57c2de1902606116d53e8623))


### Bug Fixes

* adding optional chaining when evaluating custom handler funcs ([9e77eff](https://github.com/alexa/ask-sdk-controls/commit/9e77eff9fdf018639f88be0c8697f8a71bfca366))
* Changed the evaluateInputHandlers function on Control to throw an error if more than one matching handlers are found ([430623b](https://github.com/alexa/ask-sdk-controls/commit/430623bf5216fb4a1a612ca3821c628eb98ac6d4))
* Fixed MultiValueListControl StateDiagram to log state ojects as strings ([a61d4b9](https://github.com/alexa/ask-sdk-controls/commit/a61d4b9ba3c03917ff874b5ae0850252d1213993))
* Moved global initialization of logger into functions/classes scope ([9d6944a](https://github.com/alexa/ask-sdk-controls/commit/9d6944a2da1e8d5c691223eae0e07ce8a692b167))
* NumberControl slot elicitation ([d8de5ff](https://github.com/alexa/ask-sdk-controls/commit/d8de5ffaedbb6278afcdd617b30d1cd6b4d9303f))
* **NumberControl:** typedoc fixes, changed logic to use map instead of switch statements ([97c934b](https://github.com/alexa/ask-sdk-controls/commit/97c934b3c295db62e677cfef7f131975950e6a93))
* remove dead code in QuestionnaireControlBuiltins ([f74b50b](https://github.com/alexa/ask-sdk-controls/commit/f74b50b6bd74c767d5d4ab780fea65c6017fecca))
* resolve dropped inputs in questionnaire (UserEvent race-condition) ([6a0567a](https://github.com/alexa/ask-sdk-controls/commit/6a0567a8651570efc7f85a1180d0ebf68ecf3d1c))

## [0.6.0](https://github.com/alexa/ask-sdk-controls/compare/v0.5.1...v0.6.0) (2021-03-29)


### ⚠ BREAKING CHANGES

* Changed the return type of valueRendered from string to ListControlRenderedItem to support ImageList rendering for list Items.
*  - the default behavior for an exception thrown during canHandle is
   changed. Revert to the old behavior by setting
   ControlHandler.canHandleThrowBehavior = 'Rethrow'

### Features

* added APL component mode to render multiple APLs from different controls on each turn ([7f22681](https://github.com/alexa/ask-sdk-controls/commit/7f2268181fc00cd5f7f51ea376bd1b934c52b884))
* APLComponent Mode in commonControls and refactors ([2fd688a](https://github.com/alexa/ask-sdk-controls/commit/2fd688a05b3afd716ae1be579c4f009cdd0073e1))
* Greater control over top-level exception handling behavior ([764d43c](https://github.com/alexa/ask-sdk-controls/commit/764d43cbbf31e432a1393d432bcb1ac39c0e80bf)), closes [#1](https://github.com/alexa/ask-sdk-controls/issues/1) [#2](https://github.com/alexa/ask-sdk-controls/issues/2)
* Introduced a new optional prop in apl `renderComponent` to customize the APL component returned by a control ([222d8e5](https://github.com/alexa/ask-sdk-controls/commit/222d8e5383d1ebaf8fd30b4ec4f9ca5771d29244))
* **listControl:** refactor default APL for listControl and removed apl customHandling funcs ([bc65af2](https://github.com/alexa/ask-sdk-controls/commit/bc65af207e46cda8d3836a0a260def5f3c4ffd38))
* made Control.value mandatory in all controls ([8a726c9](https://github.com/alexa/ask-sdk-controls/commit/8a726c9af69deaa5c37ed439a91eb6269b1d6fc0))
* standardize lastInitiative state tracking on all controls ([864d0f2](https://github.com/alexa/ask-sdk-controls/commit/864d0f20adffe18bfd0c35a1198fdfdf64fc5580))


### Bug Fixes

* changed DateRangeControl to use Control.value in its state to be consistent among all controls ([b960421](https://github.com/alexa/ask-sdk-controls/commit/b96042115b120465203f62d87a5941a063599816))
* changed lastInitiativeState defintion to an interface ([f12ab92](https://github.com/alexa/ask-sdk-controls/commit/f12ab9201dd5347c944b3b89770e8547bfa22396))
* stub error exceptions thrown during exceptionHandling unit test cases ([53f6835](https://github.com/alexa/ask-sdk-controls/commit/53f6835798c3a9ae14d97a0911df52c524f64a47))

### [0.5.1](https://github.com/alexa/ask-sdk-controls/compare/v0.5.0...v0.5.1) (2021-01-19)


### Docs

* fixed Changelog previous release messages and formatting issues ([7e52e9f](https://github.com/alexa/ask-sdk-controls/commit/7e52e9fea3a8af73d4552072a2b3bb5f716b2a05))

## [0.5.0](https://github.com/alexa/ask-sdk-controls/compare/v0.4.0...v0.5.0) (2021-01-19)


### ⚠ BREAKING CHANGES

* change to interaction model building flow. (controls must be added after custom content) 
* various additions and minor changes to built-in interaction model content

### Features

* **MultiValueList:** added multiValueListControl and its default APL ([59f970f](https://github.com/alexa/ask-sdk-controls/commit/59f970f207e80bac49e80d38ca76281f9799a6cb))
* add APL for NumberControl ([831cc83](https://github.com/alexa/ask-sdk-controls/commit/831cc83df63665742daf612c9f12f081326a03dc))
* async load/save of control state ([c492307](https://github.com/alexa/ask-sdk-controls/commit/c492307473f70895c33f6fd04e412efb5a7cb63d))
* **QuestionnarieControl:** added QuestionnaireControl ([65ed192](https://github.com/alexa/ask-sdk-controls/commit/65ed192f712e569d54f84deede7b5808f429e188))
* **questionnaire:** improve APL behavior ([759719e](https://github.com/alexa/ask-sdk-controls/commit/759719e50a304a4265930404f1c4af98475a1ef1))
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

* (minor) ControlManager.createControlTree(). Removed controlStateBag parameter
* (minor) renamed LanguageStrings.systemResources to defaultI18nResources

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

This release contains the following changes :
 - minor bug fixes and npm packaging configurations.

### [0.2.3](https://github.com/alexa/ask-sdk-controls/compare/v0.2.2...v0.2.3) (2020-09-11)

This release contains the following changes :
 - minor bug fixes and npm packaging configurations.

### [0.2.2](https://github.com/alexa/ask-sdk-controls/compare/v0.2.2...v0.2.1) (2020-09-10)

This release contains the following changes :
 - minor bug fixes.

### [0.2.1](https://github.com/alexa/ask-sdk-controls/compare/v0.2.1...v0.2.0) (2020-07-21)

This release contains the following changes : 

- add chai as runtime dependency.
- add the Changelog.

## [0.2.0](https://github.com/alexa/ask-sdk-controls/compare/v0.2.0...v0.2.0) (2020-07-21)

This release contains the following changes : 

- Initial release for ask-sdk-controls for ASK SDK for Node.js.
