import { connect } from "puppeteer-real-browser";
import fs from "fs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  async function selectField(field, value) {
    const parent = await page.$$("div.sc-cZFQFd.bokGRY");
    for (let element of parent) {
      const text = await page.evaluate((el) => el.textContent.trim(), element);
      if (text == field) {
        await element.click();
        break;
      }
    }
    await sleep(2000);
    for (const options of value) {
      const elements = await page.$$(".sc-gsGlKL.URrNE");
      for (let element of elements) {
        const text = await page.evaluate((el) => el.textContent, element);
        if (text.trim() == options) {
          await element.click();
          await sleep(50);
          break;
        }
      }
    }
    await sleep(1000);
  }

  async function initialize() {
    await page.waitForSelector(".sc-cZFQFd.bokGRY");

    await selectField("Board", ["A Levels"]);
    await selectField("Subject", ["Physics"]);
    await selectField("Paper", ["1", "2"]);
    await selectField("Topics", [
      "CH 1 - PHYSICAL QUANTITIES & UNITS",
      "CH 2 - MEASUREMENT TECHNIQUES",
      "CH 3 - KINEMATICS",
      "CH 4 - DYNAMICS",
      "CH 5 - FORCES, DENSITY & PRESSURE",
      "CH 6 - WORK, ENERGY & POWER",
      "CH 9 - DEFORMATION OF SOLIDS",
    ]);
    await selectField("Session", ["May/June", "Oct/Nov"]);
    await selectField("Years", [
      "2023",
      "2022",
      "2021",
      "2020",
      "2019",
      "2018",
      "2017",
      "2016",
      "2015",
      "2014",
      "2013",
      "2012",
      "2011",
      "2010",
      "2009",
    ]);
    await selectField("Difficulty", ["Medium", "Medium-high", "High"]);
    await page.click("button#get-questions-button");
  }

  const response = await connect({
    fingerprint: false,

    turnstile: true,

    connectOption: {},

    tf: true,
  });
  const { page, browser } = response;
  let questionsArray = { question: [], markScheme: [] };

  try {
    await page.setViewport({ width: 1280, height: 720 });
    // await page.goto("https://markhint.in/topical");
    // await initialize();
    // await page.goto(
    //   "https://markhint.in/topical/a-levels/9702/results?papers=1;2&topics=%20CH%201%20-%20PHYSICAL%20QUANTITIES%20%26%20UNITS;%20CH%202%20-%20MEASUREMENT%20TECHNIQUES;%20CH%203%20-%20KINEMATICS;%20CH%204%20-%20DYNAMICS;%20CH%205%20-%20FORCES%2C%20DENSITY%20%26%20PRESSURE;%20CH%206%20-%20WORK%2C%20ENERGY%20%26%20POWER;%20CH%209%20-%20DEFORMATION%20OF%20SOLIDS&years=2023;2022;2021;2020;2019;2018;2017;2016;2015;2014;2013;2012;2011;2010;2009&sessions=May/June;Oct/Nov&variants=&levels=&units=&difficulty=3;4;5&page=0"
    // );

    await page.goto(
      "https://markhint.in/topical/a-levels/9702/results?papers=2;1&topics=%20CH%201%20-%20PHYSICAL%20QUANTITIES%20%26%20UNITS;%20CH%202%20-%20MEASUREMENT%20TECHNIQUES;%20CH%203%20-%20KINEMATICS;%20CH%204%20-%20DYNAMICS;%20CH%205%20-%20FORCES%2C%20DENSITY%20%26%20PRESSURE;%20CH%206%20-%20WORK%2C%20ENERGY%20%26%20POWER&years=2023;2016;2012;2021;2022;2020;2019;2018;2017;2015;2014;2013;2011;2010;2009&sessions=May/June;Oct/Nov&variants=2;3;1&levels=&units=&difficulty=3;4;5;2&page=0"
    );

    await page.waitForSelector(".sc-hjjlnc.hvcoPd");
    const largestNumber = await page.evaluate(() => {
      const numbers = Array.from(document.querySelectorAll(".sc-eYqcxL")).map(
        (el) => parseInt(el.textContent)
      );
      return Math.max(...numbers);
    });

    for (let i = 1; i <= largestNumber; i++) {
      await page.waitForSelector(".sc-hjjlnc.hvcoPd");
      const parent = await page.$$(".sc-eYqcxL");
      for (let element of parent) {
        const text = await page.evaluate(
          (el) => el.textContent.trim(),
          element
        );
        if (text == i) {
          await element.click();
          break;
        }
      }
      await sleep(10000);

      const switchQuestion = await page.$$(".sc-elAWhN.bksjud");
      for (let element of switchQuestion) {
        const text = await page.evaluate(
          (el) => el.textContent.trim(),
          element
        );
        if (text == "Question") {
          await element.click();
          break;
        }
      }
      await sleep(3000);

      const questionElement = await page.$$(".sc-hjjlnc");
      for (let x = 0; x < questionElement.length; x++) {
        const element = questionElement[x];
        await element.click();
        await sleep(2000);
        const question = await page.$$("img.sc-gkSfol.kBYqqH");
        for (const image of question) {
          const imageSrc = await image.evaluate((img) => img.src);
          const imageName = imageSrc.split("/").pop().split("?")[0];
          questionsArray.question.push([imageSrc, imageName.slice(0, -4)]);
          await sleep(2000);
        }
        await page.click(".sc-elAWhN.bksjud");
        await sleep(3000);
        const isMCQ = await page.$("img.sc-gkSfol.kBYqqH");
        if (isMCQ) {
          const answer = await page.$$("img.sc-gkSfol.kBYqqH");
          for (const image of answer) {
            const imageSrc = await image.evaluate((img) => img.src);
            const imageName = imageSrc.split("/").pop().split("?")[0];
            questionsArray.markScheme.push([imageSrc, imageName.slice(0, -4)]);
            await sleep(2000);
          }
        } else {
          const element = await page.$(".sc-cLNonn.faNhRA");
          const text = await page.evaluate((el) => el.textContent, element);
          questionsArray.markScheme.push([
            text,
            questionsArray.question[x][1].replace("qp", "ms"),
          ]);
          await sleep(1000);
        }
        {
        }
      }
    }
    const jsonData = JSON.stringify(questionsArray, null, 2);
    fs.writeFileSync("output.txt", jsonData, "utf8");
    console.log("Data exported to output.txt");
    await browser.close();
  } catch (error) {
    console.log(error);
  }
}

main();
