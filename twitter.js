import { connect } from "puppeteer-real-browser";

function randomDelay() {
  const min = 5 * 1000;
  const max = 10 * 1000;
  const randomTime = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => {
    setTimeout(function () {
      resolve();
    }, randomTime);
  });
}

async function main(email, username, password, link, isPost) {
  const response = await connect({
    headless: "false",

    args: [
      "--start-maximized'",
      "--disable-popup-blocking",
      "--guest",
      "--window-size=1920,1080",
    ],

    customConfig: {},

    skipTarget: [],

    fingerprint: false,

    turnstile: true,

    connectOption: {},

    tf: true,
  });
  const { page } = response;
  try {
    await page.goto("https://twitter.com/i/flow/login");
    await page.evaluate(() => {
      document.body.style.transform = "scale(0.50)";
      document.body.style.transformOrigin = "top left";
    });
    await page.waitForSelector(
      "input.r-30o5oe.r-1dz5y72.r-13qz1uu.r-1niwhzg.r-17gur6a.r-1yadl64.r-deolkf.r-homxoj.r-poiln3.r-7cikom.r-1ny4l3l.r-t60dpp.r-fdjqy7"
    );
    await page.type(
      "input.r-30o5oe.r-1dz5y72.r-13qz1uu.r-1niwhzg.r-17gur6a.r-1yadl64.r-deolkf.r-homxoj.r-poiln3.r-7cikom.r-1ny4l3l.r-t60dpp.r-fdjqy7",
      email
    );
    await randomDelay();
    const next = await page.$$(
      ".css-175oi2r.r-sdzlij.r-1phboty.r-rs99b7.r-lrvibr.r-ywje51.r-usiww2.r-13qz1uu.r-2yi16.r-1qi8awa.r-ymttw5.r-1loqt21.r-o7ynqc.r-6416eg.r-1ny4l3l"
    );
    await next[0].click();
    await page.waitForSelector(
      ".css-175oi2r.r-17bb2tj.r-1muvv40.r-127358a.r-1ldzwu0",
      {
        hidden: true,
      }
    );
    const isTextPresent = await page.evaluate((text) => {
      return document.documentElement.innerText.includes(text);
    }, "Enter your phone number or username");
    if (isTextPresent) {
      await page.type(
        "input.r-30o5oe.r-1dz5y72.r-13qz1uu.r-1niwhzg.r-17gur6a.r-1yadl64.r-deolkf.r-homxoj.r-poiln3.r-7cikom.r-1ny4l3l.r-t60dpp.r-fdjqy7",
        username
      );
      const confirm = await page.$$(
        ".css-175oi2r.r-sdzlij.r-1phboty.r-rs99b7.r-lrvibr.r-19yznuf.r-64el8z.r-1dye5f7.r-1loqt21.r-o7ynqc.r-6416eg.r-1ny4l3l"
      );
      await randomDelay();
      await confirm[0].click();
      await page.waitForSelector(
        ".css-175oi2r.r-17bb2tj.r-1muvv40.r-127358a.r-1ldzwu0",
        {
          hidden: true,
        }
      );
    }
    await page.waitForSelector(
      "input.r-30o5oe.r-1dz5y72.r-13qz1uu.r-1niwhzg.r-17gur6a.r-1yadl64.r-deolkf.r-homxoj.r-poiln3.r-7cikom.r-1ny4l3l.r-t60dpp.r-fdjqy7"
    );
    await page.type(
      "input.r-30o5oe.r-1dz5y72.r-13qz1uu.r-1niwhzg.r-17gur6a.r-1yadl64.r-deolkf.r-homxoj.r-poiln3.r-7cikom.r-1ny4l3l.r-t60dpp.r-fdjqy7",
      password
    );
    await randomDelay();
    const login = await page.$$(
      ".css-175oi2r.r-sdzlij.r-1phboty.r-rs99b7.r-lrvibr.r-19yznuf.r-64el8z.r-1dye5f7.r-1loqt21.r-o7ynqc.r-6416eg.r-1ny4l3l"
    );
    await login[0].click();
    await page.waitForSelector(
      ".css-175oi2r.r-17bb2tj.r-1muvv40.r-127358a.r-1ldzwu0",
      {
        hidden: true,
      }
    );
    await randomDelay();
    await page.goto(link);

    while (true) {
      await page.evaluate(() => {
        window.scrollBy({
          top: 600,
          behavior: "smooth",
        });
      });
      await page.waitForTimeout(5555);
      let like = await page.$$('[data-testid="like"]');
      let retweet = await page.$$('[data-testid="retweet"]');
      let bookmark = await page.$$('[data-testid="bookmark"]');
      let i = 0;
      let x = 0;
      let y = 0;
      if (isPost) {
        i = 1;
        x = 1;
        y = 1;
      }
      for (; i < like.length; i++) {
        try {
          await like[i].click();
          await randomDelay();
        } catch (error) {
          continue;
        }
      }
      for (; x < bookmark.length; x++) {
        try {
          await bookmark[x].click();
          await randomDelay();
        } catch (error) {
          continue;
        }
      }
      for (; y < retweet.length; y++) {
        try {
          await retweet[y].click();
          await page.waitForSelector(
            ".css-175oi2r.r-1loqt21.r-18u37iz.r-ymttw5.r-1f1sjgu.r-13qz1uu.r-o7ynqc.r-6416eg.r-1ny4l3l"
          );
          await page.waitForTimeout(1000);
          await page.click(
            ".css-175oi2r.r-1loqt21.r-18u37iz.r-ymttw5.r-1f1sjgu.r-13qz1uu.r-o7ynqc.r-6416eg.r-1ny4l3l"
          );
          await randomDelay();
        } catch (error) {
          continue;
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

// main(
//   "JohnstonRo42193",
//   "JohnstonRo42193",
//   "zr8Q2Ixh18GW76Xrk3Y0qbZyESUj1W3HMn8NbywRDtLRk9hPQD",
//   "https://twitter.com/TDaruus44",
//   false
// );

// main(
//   "RomanDawso20700",
//   "RomanDawso20700",
//   "dej3TXXSkNrPhmlmM4yt9MleJnF0Ix0gqBbIkFsMD1lCzYZ5xU",
//   "https://twitter.com/TDaruus44",
//   false
// );

// main(
//   "EllenP261",
//   "EllenP261",
//   "lDP5WuD99RlSKu8TN6KrRG3knIqiXFjS76X8Mnenut5oPfEdGs"
// );

// main(
//   "JohnstonRo41466",
//   "JohnstonRo41466",
//   "B5BJ069cXS18YOLARXvaLZMs9v6ioPMVOfsccrDhggqvzildyJ"
// );

// main(
//   "frazier_ma65316",
//   "frazier_ma65316",
//   "qyqzdTaWyczkh9kFLS4DA8LaGqIUiFQ11UdqsYBLMvKIZXNVlI"
// );

// main(
//   "EbonyJones76880",
//   "EbonyJones76880",
//   "yGZ6ZOHhGrGhBQbRtvw3OPkkVSRUUmWrloHEuOhHyJLFgYMY3h"
// );

// main(
//   "HarrisonSa62374",
//   "HarrisonSa62374",
//   "YMujxMLnPjWGS9ECL3Wjswq5UrVku7cXDDZhktWCaIJEgr6Vt0"
// );

// main(
//   "KristaWade29424",
//   "KristaWade29424",
//   "FEVGws9YyvqUWTPgaACt8BnH4JLbN2cR5f6KmXzZu3S7hMdQDp"
// );

main(
  "ShawnKelly75370",
  "ShawnKelly75370",
  "Cxbkzz0y1cWoautCfVmW25y0kUGQ1gM1dk5Nk2SjRnNDv7SEcf",
  "https://twitter.com/DOG_ON_SOL8888",
  false
);

// main(
//   "WarnerAnge25733",
//   "WarnerAnge25733",
//   "jCGPryhV7uS4A8MnmBNWLbeJ6tRTYx5c9EsdvkpQg3XZwKzDUa",
//   "https://twitter.com/TDaruus44",
//   false
// );
