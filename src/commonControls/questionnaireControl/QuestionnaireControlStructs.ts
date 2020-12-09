import { ControlInput } from '../../controls/ControlInput';
import { StringOrList } from '../../utils/BasicTypes';
import { QuestionnaireControl } from './QuestionnaireControl';

export interface Question {
    /**
     * Identifier
     */
    id: string;

    /**
     * Target-slot values associated with this question.
     *
     * **Example:**
     *
     * Assume the user says "yes I like cats", and appropriate action and target are
     * configured in the interaction model
     *
     * ```
     * 'target':
     * {
     *  id: 'cat',
     *  name: {
     *    value: 'cats'
     *    synonyms: ['kitty', 'kitties']
     *  }
     * }
     *
     * 'choice':
     * {
     *  id: 'like',
     *  name: {
     *    value: 'like'
     *    synonyms: ['like', 'I like', 'adore', 'I adore', 'fond', 'fond of', 'I\'m fond of']
     *  }
     * }
     * ```
     *
     * Regardless of what the active question is, a user input of 'I like cats' will be
     * parsed by NLU as a `ControlIntent` with slot values
     * ```
     * value: 'like'
     * target: 'cats'
     * ```
     * which will be interpreted by the Questionnaire Control as an answer.
     */
    targets: string[];

    /**
     * Rendered form of the question for use in prompts.
     *
     * - This prompt should be a complete sentence with leading uppercase and trailing question-mark.
     */
    prompt: StringOrList | ((control: QuestionnaireControl, input: ControlInput) => StringOrList);

    /**
     * Short-form rendering of the question for use in prompts.
     *
     * This prompt should be a phrase without leading uppercase and no punctuation.
     *
     * When rendering ValueSetAct, the short form of the question is used
     *  construct a prompt like "OK, yes for cats."
     *
     * Example:
     * ```
     *  questionPrompt: "Do you like cats?"
     *  questionPromptShortForm: "cats"
     * ```
     *
     */
    promptShortForm: string | ((control: QuestionnaireControl, input: ControlInput) => string);

    /**
     * Rendered form of the question for use on screen.
     */
    visualLabel: string | ((control: QuestionnaireControl, input: ControlInput) => string);
}

export interface Choice {
    /**
     * Identifier
     */
    id: string;

    /**
     * A short (1-3 character) form to use as APL column headers.
     */
    aplColumnHeader: string;

    /**
     * Rendered form of the choice for use in prompts.
     *
     * - Rendered form should be a short phrase without punctuation.
     *
     * Examples: 'like', 'do not like'
     * Example prompt:  'Did you say [like]?'
     */
    prompt: string;

    /**
     * Text-character to display when selected
     */
    selectedCharacter?: string;

    /**
     * Text-character to display when not selected
     */
    unselectedCharacter?: string;
}

export interface QuestionnaireContent {
    /**
     * Questions that form the questionnaire.
     */
    questions: Question[];

    /**
     * Choices that the user can choose from.
     *
     * Usage:
     * - Each item should be a slot-value-id from the props.answersSlotType.
     * - The possible answers must be the same for all questions.
     */
    choices: Choice[];

    // /**
    //  * The implied choiceID if the user answers 'yes' to one of the questions.
    //  *
    //  * Default: The last element of `choices` array, i.e. `choice[len-1]`
    //  *
    //  * Purpose:
    //  *  - main questionnaires will ask yes/no type questions (possibly with additional
    //  *    choices).  If this prop is set, the control will automatically handle 'U: No'
    //  *    and treat it as choosing the configured choice.
    //  * Example:
    //  * ```
    //  * APL:
    //  *    Frequently   Infrequently
    //  *      [  ]          [  ]         Go to the shops
    //  *      [  ]          [  ]         Shop online
    //  *      [  ]          [  ]         Use recurring orders
    //  *
    //  * A: Do you frequently do xyz?
    //  * U: yes --> equivalent to selecting 'frequently' or saying 'frequently'
    //  *
    //  * ```
    //  *
    //  */
    // choiceForYesUtterance?: string;

    // /**
    //  * The implied choiceID if the user answers 'no' to one of the questions.
    //  *
    //  * Default: The last element of `choices` array, i.e. `choice[len-1]`
    //  *
    //  * Purpose:
    //  *  - main questionnaires will ask yes/no type questions (possibly with additional
    //  *    choices).  If this prop is set, the control will automatically handle 'U: No'
    //  *    and treat it as choosing the configured choice.
    //  * Example:
    //  * ```
    //  * APL:
    //  *    Frequently   Infrequently
    //  *      [  ]          [  ]         Go to the shops
    //  *      [  ]          [  ]         Shop online
    //  *      [  ]          [  ]         Use recurring orders
    //  *
    //  * A: Do you frequently do xyz?
    //  * U: yes --> equivalent to selecting 'frequently' or saying 'frequently'
    //  *
    //  * ```
    //  *
    //  */
    // choiceForNoUtterance?: string;
}

// export interface RenderedQuestionnaireContent {
//     /**
//      * Simple rendering for each question, by ID.
//      *
//      * Used in default prompts/APL and available for use in custom prompts.
//      */
//     questions: {[key: string]: string};

//     /**
//      * Simple rendering for each choice, by ID.
//      *
//      * Used in default prompts/APL and available for use in custom prompts.
//      */
//     choices: {[key: string]: string};
// }

/**
 * Indicates the user's answer to a question and whether there is a perceived risk of misunderstanding.
 */
export class QuestionnaireLineItemAnswer {
    questionId: string;
    answerId: string;
    atRiskOfMisunderstanding: boolean;

    constructor(questionId: string, answerId: string, atRiskOfMisunderstanding: boolean) {
        this.questionId = questionId;
        this.answerId = answerId;
        this.atRiskOfMisunderstanding = atRiskOfMisunderstanding;
    }
}
