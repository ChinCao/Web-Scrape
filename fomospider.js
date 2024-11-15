import { connect } from "puppeteer-real-browser";

async function main(votes) {
  for (let index = 0; index < votes; index++) {
    const response = await connect({
      headless: "false",

      args: [
        "--window-size=1920,1080",
        "--start-maximized'",
        "--disable-popup-blocking",
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
      await page.goto("https://fomospider.com/coin/DOG");

      await page.waitForSelector(".btn-1.btn-vote");
      await page.evaluate(() => {
        document.body.style.transform = "scale(0.50)";
        document.body.style.transformOrigin = "top left";
      });
      await page.waitForTimeout(1500);
      await page.waitForSelector(".btn-1.btn-vote");
      page.$(`.btn-1.btn-vote`)[0];
      await page.$eval(`.btn-1.btn-vote`, (element) => {
        element.click();
      });
      await page.waitForSelector(".spinner-border.spinner-border-sm.mx-1", {
        hidden: true,
      });
      await browser.close();
    } catch (error) {
      console.log(error);
      await browser.close();
      throw EvalError("Clicked failed");
    }
  }
}
main(1);
