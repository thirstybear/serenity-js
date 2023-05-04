import { f, LogicError } from '@serenity-js/core';
import { ByCss, ByCssContainingText, ByDeepCss, ById, ByTagName, ByXPath, Locator, PageElement, RootLocator, Selector } from '@serenity-js/web';
import type { Element } from 'webdriverio';

import { WebdriverIOErrorHandler } from '../WebdriverIOErrorHandler.js';
import { WebdriverIOPageElement } from '../WebdriverIOPageElement.js';
import { WebdriverIORootLocator } from './WebdriverIORootLocator.js';

/**
 * WebdriverIO-specific implementation of {@apilink Locator}.
 *
 * @group Models
 */
export class WebdriverIOLocator extends Locator<Element, string> {

    constructor(
        parent: RootLocator<Element>,
        selector: Selector,
        private readonly errorHandler: WebdriverIOErrorHandler,
    ) {
        super(parent, selector);
    }

    // todo: refactor; replace with a map and some more generic lookup mechanism
    protected nativeSelector(): string {
        if (this.selector instanceof ByCss) {
            return this.selector.value;
        }

        if (this.selector instanceof ByDeepCss) {
            return `>>> ${ this.selector.value }`;
        }

        if (this.selector instanceof ByCssContainingText) {
            return `${ this.selector.value }*=${ this.selector.text }`;
        }

        if (this.selector instanceof ById) {
            return `#${ this.selector.value }`;
        }

        if (this.selector instanceof ByTagName) {
            return `<${ this.selector.value } />`;
        }

        if (this.selector instanceof ByXPath) {
            return this.selector.value;
        }

        throw new LogicError(f `${ this.selector } is not supported by ${ this.constructor.name }`);
    }

    async isPresent(): Promise<boolean> {
        try {
            const element = await this.resolveNativeElement();
            return Boolean(element);
        }
        catch {
            return false;
        }
    }

    async nativeElement(): Promise<Element> {
        try {
            return await this.resolveNativeElement();
        }
        catch (error) {
            return await this.errorHandler.executeIfHandled(error, () => this.resolveNativeElement());
        }
    }

    private async resolveNativeElement(): Promise<Element> {
        const parent = await this.parent.nativeElement();

        if (parent.error) {
            throw parent.error;
        }

        const element = await parent.$(this.nativeSelector());

        if (element.error) {
            throw element.error;
        }

        return element;
    }

    async allNativeElements(): Promise<Array<Element>> {
        const parent = await this.parent.nativeElement();
        return parent.$$(this.nativeSelector());
    }

    of(parent: WebdriverIOLocator): Locator<Element, string> {
        return new WebdriverIOLocator(parent, this.selector, this.errorHandler);
    }

    locate(child: WebdriverIOLocator): Locator<Element, string> {
        return new WebdriverIOLocator(this, child.selector, this.errorHandler);
    }

    element(): PageElement<Element> {
        return new WebdriverIOPageElement(this);
    }

    async allElements(): Promise<Array<PageElement<Element>>> {
        const elements = await this.allNativeElements();

        return elements.map(childElement =>
            new WebdriverIOPageElement(
                new ExistingElementLocator(
                    this.parent as WebdriverIORootLocator,
                    this.selector,
                    this.errorHandler,
                    childElement
                )
            )
        );
    }
}

/**
 * @private
 */
class ExistingElementLocator extends WebdriverIOLocator {
    constructor(
        parentRoot: RootLocator<Element>,
        selector: Selector,
        errorHandler: WebdriverIOErrorHandler,
        private readonly existingNativeElement: Element,
    ) {
        super(parentRoot, selector, errorHandler);
    }

    async nativeElement(): Promise<Element> {
        return this.existingNativeElement;
    }

    async allNativeElements(): Promise<Array<Element>> {
        return [ this.existingNativeElement ];
    }
}
