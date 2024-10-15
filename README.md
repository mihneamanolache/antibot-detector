# AntiBotDetector

[![npm version](https://img.shields.io/npm/v/@mihnea.dev/antibot-detector.svg)](https://www.npmjs.com/package/@mihnea.dev/antibot-detector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**AntiBotDetector** is a tool designed to detect if a website is using an anti-bot or fingerprinting system. It analyzes requests, cookies, headers, and various other signals to identify common anti-bot technologies such as Cloudflare, Akamai, reCAPTCHA, DataDome, and more.

This project builds upon the technology detection logic originally introduced in [**Wappalyzer**](https://www.wappalyzer.com/) to identify technologies in addition to common website technologies. We're currently using `technologies` files maintained by the [Pentest-Tools.com](https://pentest-tools.com/) team on [their fork of Wappalyzer](https://github.com/pentesttoolscom/wappalyzer). 

## Features

- Detects anti-bot technologies like Akamai, Cloudflare, reCAPTCHA, DataDome, and many more.
- Analyzes HTTP requests, responses, cookies, JavaScript variables, DOM elements, and more.
- Lightweight and easy to use.
- Can be used for web scraping or automation projects that need to avoid or detect anti-bot systems.
- **Supports browserless.io**: Seamlessly connects to browserless for remote browser automation.

## Installation
```bash
# Using npm
npm install @mihnea.dev/antibot-detector
# Using yarn
yarn add @mihnea.dev/antibot-detector
```

## Usage

AntiBotDetector can be configured to use [browserless.io](https://www.browserless.io/) for remote browser automation. It connects over WebSocket and launches a browser instance. To configure, set the BROWSERLESS_HOST and BROWSERLESS_PORT environment variables.

```bash
# Run the browserless/multiple Docker container
docker run -p 3000:3000 -e "TIMEOUT=60000" ghcr.io/browserless/multiple:latest
```
Here's an example of how to use **AntiBotDetector** to detect anti-bot technologies on a website:
```typescript
import AntiBotDetector, { type AntiBotResults } from "@mihnea.dev/antibot-detector";

/** Helper function to report detections */
function reportDetections(detections: AntiBotResults, url: string): void {
  console.log(`Test results for ${url}\n`);

  // Display Anti-Bot Detections
  if (detections.antiBot.length > 0) {
    console.log('Anti-Bot Technologies Detected:\n');
    detections.antiBot.forEach((detection): void => {
      console.log(`⚠️  ${detection.name} detected:`);
      console.log(`- Pattern Type: ${detection.pattern.type}`);
      if (detection.pattern.key) {
        console.log(`- Key: ${detection.pattern.key}`);
      }
      console.log(`- Pattern: ${detection.pattern.pattern}`);
      if (detection.version) {
        console.log(`- Version: ${detection.version}`);
      }
      console.log(`- Confidence: ${detection.confidence.toString()}%\n`);
    });
  } else {
    console.log('No Anti-Bot Technologies Detected.\n');
  }

  // Display Other Detections
  if (detections.other.length > 0) {
    console.log('Other Technologies Detected:\n');
    detections.other.forEach((detection): void => {
      console.log(`⚠️  ${detection.name} detected:`);
      console.log(`- Pattern Type: ${detection.pattern.type}`);
      if (detection.pattern.key) {
        console.log(`- Key: ${detection.pattern.key}`);
      }
      console.log(`- Pattern: ${detection.pattern.pattern}`);
      if (detection.version) {
        console.log(`- Version: ${detection.version}`);
      }
      console.log(`- Confidence: ${detection.confidence.toString()}%\n`);
    });
  } else {
    console.log('No Other Technologies Detected.\n');
  }
}

(async (): Promise<void> => {
    const URL: string = "https://www.example.com";
    const detector: AntiBotDetector = new AntiBotDetector();
    const result: AntiBotResults = await detector.run(URL);
    reportDetections(result, URL);
})().catch((err: unknown): void => {
  console.error("An error occurred:", err);
});
```

*NOTE*: If you want to launch a local browser instead of using browserless, you can override the launchBrowser method in your code:
```typescript
import AntiBotDetector, { type AntiBotResults } from "@mihnea.dev/antibot-detector";
import { firefox, type Browser, type BrowserType, type LaunchOptions } from "playwright";

class LocalAntiBotDetector extends AntiBotDetector {
    public constructor(
        browserType: BrowserType = firefox,
        launchOptions?: LaunchOptions

    ) {
        super(browserType, launchOptions);
    }

    protected async launchBrowser(): Promise<Browser> {
        return await this._BrowserType.launch(this._LaunchOptions);
    }
}

(async (): Promise<void> => {
    const URL: string = "https://www.example.com";
    const detector: AntiBotDetector = new LocalAntiBotDetector(firefox, { headless: false });
    const result: AntiBotResults = await detector.run(URL);
    console.log(JSON.stringify(result, null, 2));
})().catch((err: unknown): void => {
  console.error("An error occurred:", err);
});
```

## Output

The `run` method of **AntiBotDetector** returns a structured result that provides detailed information on detected technologies and metadata. The result is of type `AntiBotResults`, which consists of three main parts: `antiBot` (detected anti-bot technologies), `other` (other detected technologies), and `metadata` (page-specific metadata like status code, headers, etc.).

```json
{
  "antiBot": [
    {
      "name": "reCAPTCHA",
      "pattern": { "type": "headers", "pattern": "some-pattern" },
      "version": undefined,
      "confidence": 100
    }
  ],
  "other": [
    {
      "name": "HSTS",
      "pattern": { "type": "headers", "pattern": "some-pattern" },
      "version": undefined,
      "confidence": 100
    },
  ],
  "metadata": {
    "url": "https://www.google.com/recaptcha/api2/demo",
    "status_code": 200,
    "headers": {
      "content-type": "text/html; charset=utf-8",
      "expires": "Tue, 15 Oct 2024 07:15:33 GMT",
      "date": "Tue, 15 Oct 2024 07:15:33 GMT",
      "cache-control": "private, max-age=0",
      "content-security-policy": "script-src 'nonce-dwyegxnaEljCgcb1Bt7Lyw' ...",
      "server": "ESF",
      "x-firefox-spdy": "h2"
    },
    "cookies": []
  }
}
```

## Detection Criteria

AntiBotDetector uses multiple signals to detect anti-bot technologies:

- Headers: Certain headers like `Server`, `X-Iinfo`, or `Via` may indicate anti-bot systems like Cloudflare, Akamai, or Imperva.
- Cookies: Anti-bot technologies often set specific cookies (e.g., reCAPTCHA or DataDome).
- JavaScript Variables: Certain JavaScript variables are loaded by anti-bot systems, such as grecaptcha for reCAPTCHA or PX for PerimeterX.
- DOM Elements: Some anti-bot technologies manipulate the DOM, e.g., hidden iframes or specific `<meta>` tags.
- URL Patterns: Script URLs like `recaptcha/api.js` or `ak.js` can indicate the presence of reCAPTCHA or Akamai, respectively.

## Contributing

Contributions are welcome! If you'd like to contribute to this project, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
