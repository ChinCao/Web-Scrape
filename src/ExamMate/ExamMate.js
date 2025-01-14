import {connect} from "puppeteer-real-browser";
import {sleep} from "../utils/utils.js";
import {PaperParser} from "./PaperParser.js";
import path from "path";
import fs from "fs";

async function main(subject) {
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
    args: [
      "--no-sandbox",
      "--no-first-run",
      "--no-zygote",
      "--disable-dev-shm-usage", // <-- add this one
    ],
  });
  const {page, browser} = response;
  const exammate = "https://www.exam-mate.com/topicalpastpapers";
  try {
    await page.setViewport({width: 1280, height: 720});
    await page.goto(exammate, {
      timeout: 600000,
      waitUntil: "networkidle0",
    });
    await page.evaluate(() => {
      document.body.style.zoom = "0.5";
    });

    const topicscn = "button.w-100.d-flex.align-items-center.btn.btn-light.dropdown-toggle.text-left.filter-input.filter-input-primary";
    const topicscndropdown = "a.fw-bold.me-1.cat-item";
    const fieldcndropdownitem = ".filter-menu-dropdown label";
    const fieldcn = "button.w-100.d-flex.align-items-center.btn.btn-light.dropdown-toggle.text-left.filter-input.bg-transparent.p-0";

    let previousChap = undefined;
    await page.waitForSelector(topicscn);
    const curriculum = subject["curriculum"];
    const course = subject["subject"];

    await selectField(topicscn, "Curriculum:");
    await selectField(topicscndropdown, curriculum);
    await selectField(topicscn, "Subject:");
    await selectField("a.dropdown-item", course);

    for (const chap of subject.topics) {
      if (previousChap != undefined) {
        await selectField(fieldcn, "Topic(s):");
        await selectOption(fieldcndropdownitem, previousChap);
      }
      await selectField(fieldcn, "Topic(s):");
      await selectOption(fieldcndropdownitem, chap["chapter"]);

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
              `src/ExamMate/data/${curriculum}/${course}/${folderName}/${chap["chapterName"]}/${PaperParser(text)["year"]}/${
                PaperParser(text)["season"]
              }/Paper ${PaperParser(text)["paper"]}/`,
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
      previousChap = chap["chapter"];
      console.log(`Finished stealing chapter ${chap["chapterName"]}, ${chap["chapter"]}`);
    }
    await browser.close();
  } catch (error) {
    console.log(error);
  }
}

const Physics = {
  curriculum: "A-LEVEL",
  subject: "Physics(9702)",
  topics: [
    {chapter: "CH1", chapterName: "PHYSICAL QUANTITIES & UNITS"},
    {chapter: "CH2", chapterName: "MEASUREMENT TECHNIQUES"},
    {chapter: "CH3", chapterName: "KINEMATICS"},
    {chapter: "CH4", chapterName: "DYNAMICS"},
    {chapter: "CH5", chapterName: "FORCES, DENSITY & PRESSURE"},
    {chapter: "CH6", chapterName: "WORK, ENERGY & POWER"},
    {chapter: "CH7", chapterName: "MOTION IN A CIRCLE"},
    {chapter: "CH8", chapterName: "GRAVITATIONAL FIELDS"},
    {chapter: "CH9", chapterName: "DEFORMATION OF SOLIDS"},
    {chapter: "CH10", chapterName: "IDEAL GASES"},
    {chapter: "CH11", chapterName: "TEMPERATURE"},
    {chapter: "CH12", chapterName: "THERMAL PROPERTIES OF MATERIALS"},
    {chapter: "CH13", chapterName: "OSCILLATIONS"},
    {chapter: "CH14", chapterName: "WAVES"},
    {chapter: "CH15", chapterName: "SUPERPOSITION"},
    {chapter: "CH16", chapterName: "COMMUNICATION"},
    {chapter: "CH17", chapterName: "ELECTRIC FIELDS"},
    {chapter: "CH18", chapterName: "CAPACITANCE"},
    {chapter: "CH19", chapterName: "CURRENT OF ELECTRICITY"},
    {chapter: "CH20", chapterName: "D.C. CIRCUITS"},
    {chapter: "CH21", chapterName: "ELECTRONICS"},
    {chapter: "CH22", chapterName: "MAGNETIC FIELDS"},
    {chapter: "CH23", chapterName: "ELECTROMAGNETIC INDUCTION"},
    {chapter: "CH24", chapterName: "ALTERNATING CURRENTS"},
    {chapter: "CH25", chapterName: "QUANTUM PHYSICS"},
    {chapter: "CH26", chapterName: "PARTICLE & NUCLEAR PHYSICS"},
    {chapter: "CH27", chapterName: "MEDICAL IMAGING"},
    {chapter: "CH28", chapterName: "ASTRONOMY & COSMOLOGY"},
  ],
};

const Chemistry = {
  curriculum: "A-LEVEL",
  subject: "Chemistry(9701)",
  topics: [
    [
      {chapter: "CH1", chapterName: "ATOMS, MOLECULES & STOICHIOMETRY"},
      {chapter: "CH2", chapterName: "ATOMIC STRUCTURE"},
      {chapter: "CH3", chapterName: "CHEMICAL BONDING"},
      {chapter: "CH4", chapterName: "STATES OF MATTER"},
      {chapter: "CH5", chapterName: "CHEMICAL ENERGETICS"},
      {chapter: "CH6", chapterName: "ELECTROCHEMISTRY"},
      {chapter: "CH7", chapterName: "EQUILIBRIA"},
      {chapter: "CH8", chapterName: "REACTION KINETICS"},
      {chapter: "CH9", chapterName: "THE PERIODIC TABLE: CHEMICAL PERIODICITY"},
      {chapter: "CH10", chapterName: "GROUP 2"},
      {chapter: "CH11", chapterName: "GROUP 17"},
      {chapter: "CH12", chapterName: "AN INTRODUCTION TO THE CHEMISTRY OF TRANSITION ELEMENTS"},
      {chapter: "CH13", chapterName: "NITROGEN & SULFUR"},
      {chapter: "CH14", chapterName: "AN INTRODUCTION TO ORGANIC CHEMISTRY"},
      {chapter: "CH15", chapterName: "HYDROCARBONS"},
      {chapter: "CH16", chapterName: "HALOGEN DERIVATIVES"},
      {chapter: "CH17", chapterName: "HYDROXY COMPOUNDS"},
      {chapter: "CH18", chapterName: "CARBONYL COMPOUNDS"},
      {chapter: "CH19", chapterName: "CARBOXYLIC ACIDS AND DERIVATIVES"},
      {chapter: "CH20", chapterName: "NITROGEN COMPOUNDS"},
      {chapter: "CH21", chapterName: "POLYMERISATION"},
      {chapter: "CH22", chapterName: "ANALYTICAL TECHNIQUES"},
      {chapter: "CH23", chapterName: "ORGANIC SYNTHESIS"},
    ],
  ],
};

await main(Chemistry);
