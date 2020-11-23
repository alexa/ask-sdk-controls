# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
