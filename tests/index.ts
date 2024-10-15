import { expect } from "chai";
import AntiBotDetector from "../src";
import { type AntiBotResults } from "../src/index.types";

const antiBotDetector: AntiBotDetector = new AntiBotDetector();

describe("Detect Antibot Providers", (): void => {
    it("reCAPTCHA", async (): Promise<void> => {
        const res: AntiBotResults = await antiBotDetector.run("https://www.google.com/recaptcha/api2/demo");
        console.log(res)
        expect(res.antiBot.some((a): boolean => {
            return a.name === "reCAPTCHA" && a.pattern.type === "scripts"
        })).to.equal(true);
    });

    it("Cloudflare Turnstile", async (): Promise<void> => {
        const res: AntiBotResults = await antiBotDetector.run("https://seleniumbase.io/apps/turnstile");
        expect(res.antiBot.some((a): boolean => {
            return a.name === "Cloudflare Turnstile" && a.pattern.type === "js"
        })).to.equal(true);
    });

    it("DataDome", async (): Promise<void> => {
        const res: AntiBotResults = await antiBotDetector.run("https://bounty-nginx.datashield.co/");
        expect(res.antiBot.some((a): boolean => {
            return a.name === "Datadome" && a.pattern.type === "headers"
        })).to.equal(true);
    });

});
