# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
