import fs from 'fs';
import path from 'path';
import type { Browser, BrowserContext, Page, Response, Request, BrowserType, LaunchOptions, Cookie } from 'playwright';
import { firefox } from 'playwright';
import type { AntiBotResults, Detection, MatchResult, PageData, RequestData, ResponseData, Technology, TechnologyDefinitions, TechnologyPattern, TechnologyPatterns } from './index.types';

/**
 * AntiBotDetector class is responsible for detecting anti-bot and other technologies
 * by intercepting network requests, responses, and evaluating browser content.
 */
export default class AntiBotDetector {

    /**
     * The type of browser to be used (e.g., `firefox`, `chromium`).
     */
    protected _BrowserType: BrowserType;

    /**
     * Optional browser launch options, such as `headless`.
     */
    protected _LaunchOptions: LaunchOptions | undefined;

    /**
     * Cached technologies that are loaded from JSON files.
     */
    private readonly technologies: TechnologyDefinitions = this.loadTechnologies(path.join(__dirname, 'technologies'));

    /**
     * List of known anti-bot technology names for detection.
     */
    private antiBotTechnologyNames: Array<string> = [
        'akamai',
        'cloudflare',
        'recaptcha',
        'perimeterx',
        'fingerprintjs',
        'datadome',
        'imperva',
        'kasada',
        'human security',
        'shape',
        'radware',
        'geetest',
    ];

    /**
     * Sets additional anti-bot technology names.
     * @param names Array of anti-bot technology names to add to the existing list.
     */
    public set antiBotTechnologyName(names: Array<string>) {
        this.antiBotTechnologyNames.push(...names);
    }

    /**
     * Initializes the AntiBotDetector with a specified browser type and launch options.
     * @param browserType The type of browser to use (default is `firefox`).
     * @param launchOptions Optional options to configure the browser.
     */
    public constructor(
        browserType: BrowserType = firefox,
        launchOptions?: LaunchOptions
    ) {
        this._BrowserType = browserType;
        this._LaunchOptions = launchOptions;
    }

    /**
     * Loads all technology definitions from JSON files in a specified directory.
     * @param technologiesDir The directory path where the technology files are located.
     * @returns A dictionary of technology definitions.
     */
    private loadTechnologies(technologiesDir: string): TechnologyDefinitions {
        const technologies: TechnologyDefinitions = {};

        const files: Array<string> = fs.readdirSync(technologiesDir);

        for (const file of files) {
            if (path.extname(file) === '.json') {
                const fileData: TechnologyDefinitions = JSON.parse(
                    fs.readFileSync(path.join(technologiesDir, file), 'utf-8')
                ) as TechnologyDefinitions;

                for (const [techName, techData] of Object.entries(fileData)) {
                    technologies[techName] = techData;
                }
            }
        }

        return technologies;
    }

    /**
     * Parses a technology pattern string into a regex and other associated attributes like version and confidence.
     * @param patternString The pattern string to parse.
     * @returns A `TechnologyPattern` object containing the parsed regex, version, and confidence.
     */
    private parsePattern(patternString: string): TechnologyPattern {
        const unescapedPatternString: string = patternString.replace(/\\\\/g, '\\');
        const parts: Array<string> = unescapedPatternString.split('\\;');
        const regexPart: string = parts[0];
        let version: string | undefined;
        let confidence: number = 100;

        for (let i: number = 1; i < parts.length; i++) {
            const attr: string = parts[i];
            if (attr.startsWith('version:')) {
                version = attr.slice('version:'.length);
            } else if (attr.startsWith('confidence:')) {
                confidence = parseInt(attr.slice('confidence:'.length), 10);
            }
        }

        const regex: RegExp = new RegExp(regexPart, 'i');
        return { regex, version, confidence };
    }

    /**
     * Matches an array of pattern strings against a value.
     * @param patternStrings The array of pattern strings to match.
     * @param value The value to match the patterns against.
     * @returns A `MatchResult` indicating whether the match was successful, and any associated version/confidence.
     */
    private matchPatterns(patternStrings: Array<string>, value: string): MatchResult {
        for (const patternString of patternStrings) {
            const { regex, version: versionPattern, confidence } = this.parsePattern(patternString);
            const match: RegExpExecArray | null = regex.exec(value);
            if (match) {
                let version: string | undefined;
                if (versionPattern) {
                    version = versionPattern.replace(/\\(\d+)/g, (_, groupIndex: string): string => match[parseInt(groupIndex, 10)] || '');
                }
                return { matched: true, version, confidence };
            }
        }
        return { matched: false };
    }

    /**
     * Extracts technology patterns from the provided `Technology` object.
     * @param technology A technology definition from which to extract patterns.
     * @returns An array of `TechnologyPatterns`.
     */
    private getTechnologyPatterns(technology: Technology): Array<TechnologyPatterns> {
        const patterns: Array<TechnologyPatterns> = [];

        const addPatterns: (type: string, source?: string | Record<string, string | Array<string>> | Array<string>) => void = (type: string, source?: string | Record<string, string | Array<string>> | Array<string>): void => {
            if (source) {
                // Handle case where source is a string or an array of strings
                if (typeof source === 'string' || Array.isArray(source)) {
                    const patternArray: Array<string> = Array.isArray(source) ? source : [source];
                    patternArray.forEach((pattern: string): void => {
                        patterns.push({ type, pattern });
                    });
                } 
                // Handle case where source is an object
                else if (typeof source === 'object') {
                    Object.keys(source).forEach((key): void => {
                        const value: string | Array<string> = source[key];
                        const patternArray: Array<string> = Array.isArray(value) ? value : [value];
                        patternArray.forEach((pattern: string): void => {
                            patterns.push({ type, key, pattern });
                        });
                    });
                }
            }
        };

        addPatterns('headers', technology.headers);
        addPatterns('cookies', technology.cookies);
        addPatterns('html', technology.html);
        addPatterns('scripts', technology.scripts);
        addPatterns('js', technology.js);
        addPatterns('dom', technology.dom);
        addPatterns('meta', technology.meta);
        addPatterns('url', technology.url);

        return patterns;
    }

    /**
     * Collects JavaScript variables from the evaluated page.
     * @param page The Playwright `Page` object to evaluate.
     * @param technologies The loaded technologies to match JavaScript variables.
     * @returns A dictionary of JavaScript variables found on the page.
     */
    private async collectJavaScriptVariables(page: Page, technologies: TechnologyDefinitions): Promise<Record<string, unknown>> {
        const variableExpressions: Array<string> = [];

        for (const tech of Object.values(technologies)) {
            if (tech.js) {
                variableExpressions.push(...Object.keys(tech.js));
            }
        }

        const uniqueVariableExpressions: Array<string> = Array.from(new Set(variableExpressions));

        const jsVars: Record<string, unknown> = await page.evaluate((expressions: Array<string>): Record<string, unknown> => {
            const collected: Record<string, unknown> = {};
            expressions.forEach((expression: string): void => {
                try {
                    const value: unknown = expression.split('.').reduce<unknown>((obj: unknown, prop: string): unknown => {
                        return obj && (obj as Record<string, unknown>)[prop];
                    }, window);

                    if (value !== undefined) {
                        collected[expression] = value;
                    }
                } catch { /* Ignore errors */ }
            });
            return collected;
        }, uniqueVariableExpressions);

        return jsVars;
    }

    /**
     * Collects meta tag data from the page.
     * @param page The Playwright `Page` object to evaluate.
     * @returns A dictionary of meta tag names and their content.
     */
    private async collectMetaTags(page: Page): Promise<Record<string, string>> {
        return await page.evaluate((): Record<string, string> => {
            const metas: HTMLCollectionOf<HTMLMetaElement> = document.getElementsByTagName('meta');
            const metaTags: Record<string, string> = {};
            for ( const meta of metas ) {
                const name: string | null = meta.getAttribute('name') ?? meta.getAttribute('property');
                const content: string | null = meta.getAttribute('content');
                if (name && content) {
                    metaTags[name.toLowerCase()] = content;
                }
            }
            return metaTags;
        });
    }

    /**
     * Collects matching DOM elements based on the patterns defined in the technologies.
     * @param page The Playwright `Page` object to evaluate.
     * @param technologies The loaded technologies containing DOM patterns to match.
     * @returns An array of matched DOM selectors.
     */
    private async collectDOMElements(page: Page, technologies: TechnologyDefinitions): Promise<Array<string>> {
        const selectors: Array<string> = [];

        for (const tech of Object.values(technologies)) {
            if (tech.dom) {
                const domPatterns: Array<string> = Array.isArray(tech.dom) ? tech.dom : [tech.dom];
                selectors.push(...domPatterns);
            }
        }

        const uniqueSelectors: Array<string> = Array.from(new Set(selectors));

        const domMatches: Array<string> = await page.evaluate((selectors): Array<string> => {
            const matches: Array<string> = [];
            selectors.forEach((selector: string): void => {
                try {
                    if (document.querySelector(selector)) {
                        matches.push(selector);
                    }
                } catch { /* Ignore invalid selectors */ }
            });
            return matches;
        }, uniqueSelectors);

        return domMatches;
    }

    /**
     * Connects to browserless over WebSocket and launches a browser instance.
     *
     * NOTE: Should you wish to launch a local browser, you can override this method to use Playwright's `launch` method directly:
     * ```typescript
     *  return await this._BrowserType.launch(this._LaunchOptions);
     * ```
     *
     * @returns A Playwright `Browser` instance.
     */
    protected async launchBrowser(): Promise<Browser> {
        const browserless: Record<string, string | undefined> = {
            host: process.env.BROWSERLESS_HOST, 
            port: process.env.BROWSERLESS_PORT
        };
        if (!browserless.host || !browserless.port) {
            throw new Error('BROWSERLESS_HOST and BROWSERLESS_PORT environment variables must be set. Should you wish to launch a local browser, you can override the `launchBrowser` method.');
        }
        const browserWSEndpoint: string = `ws://${browserless.host}:${browserless.port}/${this._BrowserType.name()}/playwright?launch=${JSON.stringify(this._LaunchOptions)}`
        console.log(`Connecting to browserless at ${browserWSEndpoint}`);
        const browser: Browser = await this._BrowserType.connect(
            browserWSEndpoint, 
            { timeout: 25_000 });
        return browser;
    }

    /**
     * Intercepts requests and responses from the target URL and gathers content like cookies, JavaScript variables, and meta tags.
     * @param url The target URL to visit.
     * @param technologies The loaded technology definitions to use for pattern matching.
     * @returns An object containing intercepted request/response data, cookies, JavaScript variables, meta tags, and DOM matches.
     */
    private async interceptRequests(url: string, technologies: TechnologyDefinitions): Promise<PageData> {
        let browser: Browser | undefined;
        let context: BrowserContext | undefined;
        let page: Page | undefined;

        try {
            browser = await this.launchBrowser();
            context = await browser.newContext();
            page = await context.newPage();

            const requestData: Array<RequestData> = [];
            const responseData: Array<ResponseData> = [];

            page.on('request', (request: Request): void => {
                requestData.push({
                    url: request.url(),
                    method: request.method(),
                    headers: request.headers(),
                    postData: request.postData(),
                    resourceType: request.resourceType(),
                });
            });

            page.on('response', async (response: Response): Promise<void> => {
                const headers: Record<string, string> = response.headers();
                let body: string | null = null;

                try {
                    const buffer: Buffer = await response.body();
                    body = buffer.toString('utf-8');
                } catch { /* Ignore errors */}
                responseData.push({
                    url: response.url(),
                    status: response.status(),
                    headers: headers,
                    body: body,
                });
            });

            const response: Response | null = await page.goto(url, { waitUntil: 'networkidle' });

            const cookies: Array<Cookie> = await context.cookies();
            const content: string = await page.content();
            const jsVariables: Record<string, unknown> = await this.collectJavaScriptVariables(page, technologies);
            const metaTags: Record<string, string> = await this.collectMetaTags(page);
            const domMatches: Array<string> = await this.collectDOMElements(page, technologies);
            const metadata: Record<string, unknown> = {
                url: response?.url(),
                status_code: response?.status(),
                headers: response?.headers(),
                cookies: cookies,
            }

            return { requestData, responseData, cookies, content, url, jsVariables, metaTags, domMatches, metadata };
        } finally {
            await page?.close();
            await context?.close();
            await browser?.close();
        }
    }

    /**
     * Detects technologies (both anti-bot and other) from the gathered page data.
     * @param technologies The loaded technologies to use for pattern matching.
     * @param data The intercepted page data containing requests, responses, cookies, JavaScript variables, etc.
     * @returns An object containing detected anti-bot technologies and other technologies.
     */
    private detectTechnologies(technologies: TechnologyDefinitions, data: PageData): AntiBotResults {
        const antiBotDetections: Array<Detection> = [];
        const otherDetections: Array<Detection> = [];

        for (const [techName, tech] of Object.entries(technologies)) {
            const patterns: Array<TechnologyPatterns> = this.getTechnologyPatterns(tech);
            for (const patternObj of patterns) {
                let matchResult: MatchResult = { matched: false };

                switch (patternObj.type) {
                    case 'headers':
                        for (const req of data.requestData) {
                            if (patternObj.key && req.headers[patternObj.key.toLowerCase()]) {
                                matchResult = this.matchPatterns([patternObj.pattern], req.headers[patternObj.key.toLowerCase()]);
                                if (matchResult.matched) break;
                            }
                        }
                        if (matchResult.matched) break;
                        for (const res of data.responseData) {
                            if (patternObj.key && res.headers[patternObj.key.toLowerCase()]) {
                                matchResult = this.matchPatterns([patternObj.pattern], res.headers[patternObj.key.toLowerCase()]);
                                if (matchResult.matched) break;
                            }
                        }
                        break;

                    case 'cookies':
                        for (const cookie of data.cookies) {
                            if (patternObj.key && cookie.name === patternObj.key) {
                                matchResult = this.matchPatterns([patternObj.pattern], cookie.value);
                                if (matchResult.matched) break;
                            }
                        }
                        break;

                    case 'html':
                        matchResult = this.matchPatterns([patternObj.pattern], data.content);
                        break;

                    case 'scripts':
                        for (const req of data.requestData) {
                            if (req.resourceType === 'script') {
                                matchResult = this.matchPatterns([patternObj.pattern], req.url);
                                if (matchResult.matched) break;
                            }
                        }
                        break;

                    case 'js':
                        if (patternObj.key && data.jsVariables[patternObj.key] !== undefined) {
                            matchResult = this.matchPatterns([patternObj.pattern], String(data.jsVariables[patternObj.key]));
                        }
                        break;

                    case 'meta':
                        if (patternObj.key && data.metaTags[patternObj.key.toLowerCase()]) {
                            matchResult = this.matchPatterns([patternObj.pattern], data.metaTags[patternObj.key.toLowerCase()]);
                        }
                        break;

                    case 'dom':
                        if (data.domMatches.includes(patternObj.pattern)) {
                            matchResult = { matched: true, confidence: 100 };
                        }
                        break;

                    case 'url':
                        matchResult = this.matchPatterns([patternObj.pattern], data.url);
                        break;

                    default:
                        break;
                }

                if (matchResult.matched) {
                    const detection: Detection = {
                        name: techName,
                        pattern: patternObj,
                        version: matchResult.version,
                        confidence: matchResult.confidence ?? 100,
                    };

                    const lowerCaseTechName: string = techName.toLowerCase();
                    const isAntiBot: boolean = this.antiBotTechnologyNames.some((name): boolean => lowerCaseTechName.startsWith(name.toLowerCase()));

                    if (isAntiBot) {
                        antiBotDetections.push(detection);
                    } else {
                        otherDetections.push(detection);
                    }
                    break;
                }
            }
        }

        return { antiBot: antiBotDetections, other: otherDetections, metadata: data.metadata };
    }

    /**
     * Main method to run the detection process on a given URL.
     * @param url The target URL to scan for anti-bot technologies.
     * @returns An object containing detected anti-bot technologies and other technologies.
     */
    public async run(url: string): Promise<AntiBotResults> {
        const data: PageData = await this.interceptRequests(url, this.technologies);
        return this.detectTechnologies(this.technologies, data);
    }
}

export * from './index.types';
