import {connect} from "puppeteer-real-browser";
import {sleep} from "../utils/utils.js";
import {PaperParser} from "./PaperParser.js";
import path from "path";
import fs from "fs";

async function main() {
  async function selectField(fieldcn, field) {
    const parent = await page.$$(fieldcn);
    for (let element of parent) {
      const text = await page.evaluate((el) => el.textContent.trim(), element);
      if (text.includes(field)) {
        await element.click();
        break;
      }
    }

    await sleep(1000);
  }

  async function selectOption(fieldcn, field) {
    const parent = await page.$(".dropdown-menu.w-100.show");
    const childs = await parent.$$(fieldcn);
    for (let element of childs) {
      const text = await page.evaluate((el) => el.textContent.trim(), element);
      if (text.includes(field)) {
        await element.click();
        break;
      }
    }
  }
  async function maxValue(fieldcn) {
    const childs = await page.$$(fieldcn);
    let largest = 1;
    for (let element of childs) {
      const text = await page.evaluate((el) => el.textContent.trim(), element);
      if (Number(text) && Number(text) > largest) {
        largest = Number(text);
      }
    }
    return largest;
  }

  const response = await connect({
    fingerprint: false,
    headless: false,
    turnstile: true,
    tf: true,
  });
  const {page, browser} = response;
  const exammate = "https://www.exam-mate.com/topicalpastpapers";
  try {
    await page.setViewport({width: 1280, height: 720});
    await page.goto(exammate, {
      timeout: 60000,
      waitUntil: "networkidle0",
    });
    const topicscn = "button.w-100.d-flex.align-items-center.btn.btn-light.dropdown-toggle.text-left.filter-input.filter-input-primary";
    const topicscndropdown = "a.fw-bold.me-1.cat-item";
    const fieldcndropdownitem = ".filter-menu-dropdown label";
    const fieldcn = "button.w-100.d-flex.align-items-center.btn.btn-light.dropdown-toggle.text-left.filter-input.bg-transparent.p-0";
    const curriculum = "A-LEVEL";
    const subject = "Physics(9702)";
    const topic = "MEASUREMENT TECHNIQUES";
    const year = "2017";
    const paper = "1";
    const season = "Summer";
    await page.waitForSelector(topicscn);
    await selectField(topicscn, "Curriculum:");
    await selectField(topicscndropdown, curriculum);
    await selectField(topicscn, "Subject:");
    await selectField("a.dropdown-item", subject);
    await selectField(fieldcn, "Topic(s):");
    await selectOption(fieldcndropdownitem, topic);
    await selectField(fieldcn, "Paper(s):");
    await selectOption(fieldcndropdownitem, paper);
    await selectField(fieldcn, "Year(s)");
    await selectOption(fieldcndropdownitem, year);
    await selectField(fieldcn, "Season(s)");
    await selectOption(fieldcndropdownitem, season);
    for (let i = 1; i <= 6; i++) {
      await selectField(fieldcn, "Zone(s):");
      await selectOption(fieldcndropdownitem, `${i}`);
    }
    await page.click("button.btn.btn-primary.waves-effect.waves-light.btn-lg.w-100.filter-button.d-none.d-md-block");
    await sleep(2000);
    const pageAmount = await maxValue("li.page-item");

    for (let i = 1; i <= pageAmount; i++) {
      const questionsList = await page.$("ul#questions-list1");
      const children = await questionsList.$$("li");
      for (const child of children) {
        const text = await page.evaluate((el) => el.textContent, child);
        await child.click();
        async function downloadData(dataType) {
          const parentcn = dataType == "questions" ? "div#question-image-box-1" : "div#answer-image-box-1";
          const questionsParent = await page.$(parentcn);
          const questionChild = await questionsParent.$$("img");
          const srcs = await Promise.all(
            questionChild.map(async (element) => {
              return await page.evaluate((el) => el.src, element);
            })
          );
          const folderName = dataType == "questions" ? "questions" : "answers";
          const rawPath = path.join(
            process.cwd(),
            `src/ExamMate/data/${curriculum}/${subject}/${folderName}/${topic}/${year}/${season}/Paper ${paper}/`,
            PaperParser(text)["question_paper"]
          );

          if (!fs.existsSync(rawPath)) {
            fs.mkdirSync(rawPath, {recursive: true});
          }
          if (srcs.length > 0) {
            for (let i = 0; i < srcs.length; i++) {
              const imagePage = await browser.newPage();
              const viewSource = await imagePage.goto(srcs[i], {timeout: 60000});
              const buffer = await viewSource.buffer();
              const filePath = rawPath + `/${PaperParser(text)["question"]}_${i}.png`;
              fs.writeFileSync(filePath, buffer);
              await imagePage.close();
            }
          } else {
            const mcq_answer = await page.$eval("span#answer-text-1", (el) => el.textContent);
            fs.writeFile(rawPath + `/${PaperParser(text)["question"]}_${i}.txt`, mcq_answer, (err) => {
              if (err) throw err;
            });
          }
        }
        await downloadData("questions");
        await downloadData("answers");
      }

      await selectField("li.page-item", "›");
      await sleep(500);
    }
  } catch (error) {
    console.log(error);
  }
}

main();
