import { type Cookie } from "playwright";

/**
 * Represents a pattern for detecting technology.
 * It includes a regex pattern, optional version extraction, and a confidence level.
 */
export interface TechnologyPattern {
    /**
     * Regular expression used to detect the presence of the technology.
     */
    regex: RegExp;
    /**
     * Optional version extraction string to extract a version number from the match.
     */
    version?: string;
    /**
     * Confidence level of the match (1-100%), where 100% means certain.
     */
    confidence?: number;
}

/**
 * Represents patterns for matching different aspects of a technology.
 * A pattern is associated with a type (e.g., 'headers', 'cookies').
 */
export interface TechnologyPatterns {
    /**
     * The type of data to match (e.g., 'headers', 'cookies', 'scripts').
     */
    type: string;
    /**
     * The pattern string to match.
     */
    pattern: string;
    /**
     * Optional key for matching specific headers, cookies, etc.
     */
    key?: string;
}

/**
 * Represents a technology and the patterns used to detect it.
 */
export interface Technology {
    /**
     * The name of the technology (e.g., "Akamai", "Cloudflare").
     */
    name: string;
    /**
     * Optional array of category IDs this technology belongs to.
     */
    cats?: Array<number>; // Categories
    /**
     * Patterns to match in HTTP headers.
     */
    headers?: Record<string, string | Array<string>>;
    /**
     * Patterns to match in cookies.
     */
    cookies?: Record<string, string | Array<string>>;
    /**
     * Patterns to match in the HTML content.
     */
    html?: string | Array<string>;
    /**
     * Patterns to match in the script URLs.
     */
    scripts?: string | Array<string>;
    /**
     * Patterns to match in JavaScript variables.
     */
    js?: Record<string, string | Array<string>>;
    /**
     * Patterns to match in DOM elements.
     */
    dom?: string | Array<string>;
    /**
     * Patterns to match in HTML meta tags.
     */
    meta?: Record<string, string | Array<string>>;
    /**
     * Patterns to match in URLs.
     */
    url?: string | Array<string>;
}

/**
 * A dictionary of technology definitions, where each key is the name of the technology.
 */
export type TechnologyDefinitions = Record<string, Technology>;

/**
 * Represents a request made during page navigation.
 */
export interface RequestData {
    /**
     * The URL of the request.
     */
    url: string;
    /**
     * The HTTP method used (e.g., GET, POST).
     */
    method: string;
    /**
     * The headers sent with the request.
     */
    headers: Record<string, string>;
    /**
     * The body of the request (if applicable, e.g., for POST requests).
     */
    postData: string | null;
    /**
     * The type of resource being requested (e.g., 'script', 'image').
     */
    resourceType: string;
}

/**
 * Represents a response received during page navigation.
 */
export interface ResponseData {
    /**
     * The URL of the response.
     */
    url: string;
    /**
     * The HTTP status code of the response (e.g., 200 for OK).
     */
    status: number;
    /**
     * The headers received with the response.
     */
    headers: Record<string, string>;
    /**
     * The body of the response, if available.
     */
    body: string | null;
}

/**
 * Represents the result of detecting a technology on the page.
 */
export interface Detection {
    /**
     * The name of the detected technology.
     */
    name: string;
    /**
     * The matching pattern used to detect the technology.
     */
    pattern: TechnologyPatterns;
    /**
     * The detected version of the technology, if available.
     */
    version?: string;
    /**
     * Confidence level of the detection (1-100%).
     */
    confidence: number;
}

/**
 * Represents the result of attempting to match a pattern.
 */
export interface MatchResult {
    /**
     * Indicates if the pattern matched the target data.
     */
    matched: boolean;
    /**
     * The extracted version, if applicable.
     */
    version?: string;
    /**
     * Confidence level of the match (1-100%).
     */
    confidence?: number;
}

/**
 * Represents the data collected from a page during request/response interception.
 */
export interface PageData {
    /**
     * Array of request data collected from network requests made by the page.
     * Each entry includes details such as URL, method, headers, and resource type.
     */
    requestData: Array<RequestData>;

    /**
     * Array of response data collected from network responses received by the page.
     * Each entry includes details such as URL, status, headers, and response body.
     */
    responseData: Array<ResponseData>;

    /**
     * Array of cookies set by the page during navigation. Each entry represents a cookie's name, value, domain, and other attributes.
     */
    cookies: Array<Cookie>;

    /**
     * The full HTML content of the page, as a string.
     */
    content: string;

    /**
     * JavaScript variables collected from the page, mapped by their expression.
     * Each key is the variable expression, and the value is the variable's value.
     */
    jsVariables: Record<string, unknown>;

    /**
     * Meta tags collected from the page, represented as key-value pairs.
     * The key is the meta tag name or property, and the value is its content.
     */
    metaTags: Record<string, string>;

    /**
     * Array of DOM selectors that matched elements on the page.
     * Each entry represents a selector that exists in the page's DOM.
     */
    domMatches: Array<string>;

    /**
     * The URL of the page being analyzed.
     */
    url: string;

    /**
     * Metadata collected from the page.
     * This can include various information such as the status code, headers, and cookies.
     * 
     * The metadata is structured as key-value pairs where the key is a string, and the value can be of any type.
     * 
     * @example
     * {
     *   "status_code": 200,
     *   "headers": {
     *     "content-type": "text/html"
     *   },
     *   "cookies": [
     *     { "name": "sessionId", "value": "abc123" }
     *   ]
     * }
     */
    metadata: Record<string, unknown>;
}

/**
 * Represents the results of detecting anti-bot technologies on a page.
 */
export interface AntiBotResults {
    /**
     * Array of detected anti-bot technologies.
     */
    antiBot: Array<Detection>; 
    /**
     * Array of other detected technologies.
     */
    other: Array<Detection> 

    /**
     * Metadata collected from the page.
     * This can include various information such as the status code, headers, and cookies.
     */ 
    metadata: Record<string, unknown>;
}
