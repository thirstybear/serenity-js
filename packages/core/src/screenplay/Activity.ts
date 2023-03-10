import path from 'path';

import { ErrorStackParser } from '../errors';
import { FileSystemLocation, Path } from '../io';
import { UsesAbilities } from './abilities';
import { PerformsActivities } from './activities';
import { AnswersQuestions } from './questions';

/**
 * **Activities** represents {@apilink Task|tasks} and {@apilink Interaction|interactions} to be performed by an {@apilink Actor|actor}.
 *
 * Learn more about:
 * - [Performing activities at multiple levels](/handbook/design/screenplay-pattern#performing-activities-at-multiple-levels)
 * - {@apilink Actor}
 * - {@apilink PerformsActivities}
 * - [Command design pattern on Wikipedia](https://en.wikipedia.org/wiki/Command_pattern)
 *
 * @group Screenplay Pattern
 */
export abstract class Activity {

    private static errorStackParser = new ErrorStackParser();
    readonly #description: string;
    readonly #location: FileSystemLocation;

    constructor(
        description: string,
        location: FileSystemLocation = Activity.callerLocation(5)
    ) {
        this.#description = description;
        this.#location = location;
    }

    /**
     * Returns the location where this {@apilink Activity} was instantiated.
     */
    instantiationLocation(): FileSystemLocation {
        return this.#location;
    }

    /**
     * Instructs the provided {@apilink Actor} to perform this {@apilink Activity}.
     *
     * @param actor
     *
     * #### Learn more
     * - {@apilink Actor}
     * - {@apilink PerformsActivities}
     * - {@apilink UsesAbilities}
     * - {@apilink AnswersQuestions}
     */
    abstract performAs(actor: PerformsActivities | UsesAbilities | AnswersQuestions): Promise<any>;

    /**
     * Generates a human-friendly description to be used when reporting this Activity.
     *
     * **Note**: When this activity is reported, token `#actor` in the description
     * will be replaced with the name of the actor performing this Activity.
     *
     * For example, `#actor clicks on a button` becomes `Wendy clicks on a button`.
     */
    toString(): string {
        return this.#description;
    }

    protected static callerLocation(frameOffset: number): FileSystemLocation {

        const originalStackTraceLimit = Error.stackTraceLimit;
        Error.stackTraceLimit = 30;
        const error = new Error('Caller location marker');
        Error.stackTraceLimit = originalStackTraceLimit;

        const nonSerenityNodeModulePattern = new RegExp(`node_modules` + `\\` + path.sep + `(?!@serenity-js`+ `\\` + path.sep +`)`);

        const frames = this.errorStackParser.parse(error);
        const userLandFrames = frames.filter(frame => ! (
            frame?.fileName.startsWith('node:') ||          // node 16 and 18
            frame?.fileName.startsWith('internal') ||       // node 14
            nonSerenityNodeModulePattern.test(frame?.fileName)    // ignore node_modules, except for @serenity-js/*
        ));

        const index = Math.min(Math.max(1, frameOffset), userLandFrames.length - 1);
        // use the desired user-land frame, or the last one from the stack trace for internal invocations
        const invocationFrame = userLandFrames[index] || frames[frames.length - 1];

        return new FileSystemLocation(
            Path.from(invocationFrame.fileName),
            invocationFrame.lineNumber,
            invocationFrame.columnNumber,
        );
    }
}
