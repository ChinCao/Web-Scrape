import { connect } from "puppeteer-real-browser";

async function main(votes) {
  for (let index = 0; index < votes; index++) {
    const response = await connect({
      headless: "false",

      args: [
        "--window-size=1920,1080",
        "--start-maximized'",
        "--disable-popup-blocking",
        // "--headless=new",
      ],

      customConfig: {},

      skipTarget: [],

      fingerprint: false,

      turnstile: true,

      connectOption: {},

      tf: true,
    });
    const { page, browser } = response;
    try {
      await page.goto(
        "https://dexscreener.com/solana/veerjgvuqy1augxtyrgj5szkrgd3rtuyo2qqhdchzss"
      );
      await page.waitForSelector("button.chakra-button.custom-pr2mrc");
      await page.evaluate(() => {
        document.body.style.transform = "scale(0.30)";
        document.body.style.transformOrigin = "top left";
      });
      const _ = await page.$$("button.chakra-button.custom-pr2mrc");
      const button = _[Math.round(Math.random())];
      const initial_count = await page.evaluate((button) => {
        const text = button.querySelectorAll("span.chakra-text.custom-0")[1];
        return parseInt(text.textContent);
      }, button);
      await button.click();
      await page.waitForSelector(".chakra-spinner.custom-1fc7edv", {
        hidden: true,
      });
      const after_count = await page.evaluate((button) => {
        const text = button.querySelectorAll("span.chakra-text.custom-0")[1];
        return parseInt(text.textContent);
      }, button);
      if (after_count > initial_count) {
        await page.waitForTimeout(2222);
        await browser.close();
      } else {
        await browser.close();
        throw EvalError("lol");
      }
    } catch (error) {
      console.log(error);
      await browser.close();
      throw EvalError("Clicked failed");
    }
  }
}
main(1);
