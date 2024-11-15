import { connect } from "puppeteer-real-browser";
import fs from "fs";
import path from "path";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const response = await connect({
    fingerprint: false,

    turnstile: true,
    userDataDir: "C:\\Users\\lenovo\\AppData\\Local\\Google\\Chrome\\User Data",
    // args: ['--profile-directory="Profile 1"'],

    tf: true,
  });
  const { page, browser } = response;
  const password = "toiyeubachduongvoibaobanthan";
  const email = "chinhcaocu2@gmail.com";
  const bookLink =
    "https://archive.org/details/completesolution0000ande/page/821/mode/2up";

  try {
    await page.setViewport({ width: 1280, height: 720 });

    await page.goto("https://archive.org/account/login", { timeout: 60000 });
    await page.waitForSelector("input.form-element.input-email");
    await page.type("input.form-element.input-email", email);
    await page.type("input.form-element.input-password", password);
    await page.click(
      "input.btn.btn-primary.btn-submit.input-submit.js-submit-login"
    );
    await sleep(7000);
    await page.goto(bookLink, { timeout: 60000 });
    await page.waitForSelector("span.BRcurrentpage");
    const numberOfPagesRaw = await page.$eval(
      "span.BRcurrentpage",
      (el) => el.textContent
    );
    const numbers = numberOfPagesRaw.match(/\d+/g).map(Number);
    const numberOfPages = Math.max(...numbers) * 3;
    const zoomInButtonSelector = "button.BRicon.zoom_in";
    const zoomInCount = 12;
    for (let i = 0; i < zoomInCount; i++) {
      await page.click(zoomInButtonSelector);
    }
    await sleep(5000);
    let currentPage = 830;
    let savedPage = [];
    while (currentPage <= numberOfPages) {
      await page.waitForSelector("img.BRpageimage");
      const pages = await page.$$("img.BRpageimage");

      const srcs = await Promise.all(
        pages.map(async (element) => {
          return await page.evaluate((el) => el.src, element);
        })
      );

      for (let imgSrc of srcs) {
        if (!savedPage.includes(imgSrc)) {
          const imagePage = await browser.newPage();
          const viewSource = await imagePage.goto(imgSrc, { timeout: 60000 });
          const buffer = await viewSource.buffer();
          const filePath = path.join(
            `${process.cwd()}/images`,
            `page${currentPage}.png`
          );
          currentPage += 1;
          fs.writeFileSync(filePath, buffer);
          await imagePage.close();
          savedPage.push(imgSrc);
        }
      }
      await page.click("button.BRicon.book_right.book_flip_next");
      await sleep(1500);
    }
  } catch (error) {
    console.log(error);
  }
}

main();
