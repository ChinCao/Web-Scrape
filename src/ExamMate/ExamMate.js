import {connect} from "puppeteer-real-browser";
import {sleep} from "../utils/utils.js";
import {PaperParser} from "./PaperParser.js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
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
    args: ["--no-sandbox", "--no-first-run", "--no-zygote", "--disable-dev-shm-usage"],
  });
  const {page, browser} = response;
  const exammate_login = "https://www.exam-mate.com/login";
  const exammate = "https://www.exam-mate.com/topicalpastpapers";
  try {
    await page.setViewport({width: 1280, height: 720});
    await page.goto(exammate_login, {
      timeout: 6000000,
      waitUntil: "networkidle0",
    });

    await page.waitForSelector("input#emailaddress");
    await page.type("input#emailaddress", process.env.EXAMMATE_EMAIL);
    await page.type("input#password", process.env.EXAMMATE_PASS);
    await page.click("button.btn.btn-primary");
    await page.waitForNetworkIdle({idleTime: 10});

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
    for (let i = 2009; i <= 2024; i++) {
      await selectField(fieldcn, "Year(s):");
      await selectOption(fieldcndropdownitem, i);
    }

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
        await page.evaluate(() => {
          const element = document.querySelector(".mb-auto");
          if (element) {
            element.scrollTop = 0;
          }
        });

        const questionsList = await page.$("ul#questions-list1");
        const children = await questionsList.$$("li");
        await sleep(1000);
        for (const child of children) {
          const text = await page.evaluate((el) => el.textContent, child);
          await page.evaluate((element) => {
            element.click();
          }, child);
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
              `src/ExamMate/data/${curriculum}/${course}/${folderName}/${chap["chapterName"].replace(":", "-")}/${PaperParser(text)["year"]}/${
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
                const viewSource = await imagePage.goto(srcs[i], {timeout: 6000000});
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
      }
      previousChap = chap["chapter"];
      console.log(`Finished stealing chapter ${chap["chapterName"]}, ${chap["chapter"]}`);
    }
    console.log(`All data have been stolen from ${subject["subject"]}`);
    await browser.close();
  } catch (error) {
    console.log(error);
    await browser.close();
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
};
const Biology = {
  curriculum: "A-LEVEL",
  subject: "Biology(9700)",
  topics: [
    {chapter: "CH1", chapterName: "CELL STRUCTURE"},
    {chapter: "CH2", chapterName: "BIOLOGICAL MOLECULES"},
    {chapter: "CH3", chapterName: "ENZYMES"},
    {chapter: "CH4", chapterName: "CELL MEMBRANES AND TRANSPORT"},
    {chapter: "CH5", chapterName: "THE MITOTIC CELL CYCLE"},
    {chapter: "CH6", chapterName: "NUCLEIC ACIDS AND PROTEIN SYNTHESIS"},
    {chapter: "CH7", chapterName: "TRANSPORT IN PLANTS"},
    {chapter: "CH8", chapterName: "TRANSPORT IN MAMMALS"},
    {chapter: "CH9", chapterName: "GAS EXCHANGE AND SMOKING"},
    {chapter: "CH10", chapterName: "INFECTIOUS DISEASE"},
    {chapter: "CH11", chapterName: "IMMUNITY"},
    {chapter: "CH12", chapterName: "ENERGY AND RESPIRATION"},
    {chapter: "CH13", chapterName: "PHOTOSYNTHESIS"},
    {chapter: "CH14", chapterName: "HOMEOSTASIS"},
    {chapter: "CH15", chapterName: "CONTROL AND CO-ORDINATION"},
    {chapter: "CH16", chapterName: "INHERITED CHANGE"},
    {chapter: "CH17", chapterName: "SELECTION AND EVOLUTION"},
    {chapter: "CH18", chapterName: "BIODIVERSITY, CLASSIFICATION AND CONSERVATION"},
    {chapter: "CH19", chapterName: "GENETIC TECHNOLOGY"},
  ],
};
const Psychology = {
  curriculum: "A-LEVEL",
  subject: "Psychology (from 2018)(9990)",
  topics: [
    {chapter: "CH1", chapterName: "Approaches, Issues and Debates"},
    {chapter: "CH2", chapterName: "Research Methods"},
    {chapter: "CH3", chapterName: "Theory: Psychology and Abnormality"},
    {chapter: "CH4", chapterName: "Theory: Psychology and Consumer Behaviour"},
    {chapter: "CH5", chapterName: "Theory: Psychology and Health"},
    {chapter: "CH6", chapterName: "Theory: Psychology and Organisations"},
    {chapter: "CH7", chapterName: "Clinical Psychology"},
    {chapter: "CH8", chapterName: "Consumer Psychology"},
    {chapter: "CH9", chapterName: "Health Psychology"},
    {chapter: "CH10", chapterName: "Organisational Psychology"},
  ],
};
const Economics = {
  curriculum: "A-LEVEL",
  subject: "Economics(9708)",
  topics: [
    {chapter: "CH1", chapterName: "Basic Economic Ideas and Resource Allocation"},
    {chapter: "CH2", chapterName: "The Price System and the Micro Economy"},
    {chapter: "CH3", chapterName: "Government Microeconomic Intervention"},
    {chapter: "CH4", chapterName: "The Macro Economy"},
    {chapter: "CH5", chapterName: "Government Macro Intervention"},
    {chapter: "CH6", chapterName: "International Economic Issues"},
  ],
};
const Pure1 = {
  curriculum: "A-LEVEL",
  subject: "Mathematics Pure Math 1(9709)",
  topics: [
    {chapter: "CH1", chapterName: "Coordinates Geometry"},
    {chapter: "CH2", chapterName: "Functions"},
    {chapter: "CH3", chapterName: "Intersection Points"},
    {chapter: "CH4", chapterName: "Differentiation"},
    {chapter: "CH5", chapterName: "Sequences & Series"},
    {chapter: "CH6", chapterName: "Binomial Theorem"},
    {chapter: "CH7", chapterName: "Trigonometry"},
    {chapter: "CH8", chapterName: "Vectors"},
    {chapter: "CH9", chapterName: "Integration"},
    {chapter: "CH10", chapterName: "Radians"},
  ],
};
const FurtherMath = {
  curriculum: "A-LEVEL",
  subject: "Further Mathematics(9231)",
  topics: [
    {chapter: "CH1", chapterName: "Roots of polynomial equations"},
    {chapter: "CH2", chapterName: "Rational functions and graphs"},
    {chapter: "CH3", chapterName: "Summation of series"},
    {chapter: "CH4", chapterName: "Matrices"},
    {chapter: "CH5", chapterName: "Polar coordinates"},
    {chapter: "CH6", chapterName: "Vectors"},
    {chapter: "CH7", chapterName: "Proof by induction"},
    {chapter: "CH8", chapterName: "Hyperbolic functions"},
    {chapter: "CH9", chapterName: "Differentiation"},
    {chapter: "CH10", chapterName: "Integration"},
    {chapter: "CH11", chapterName: "Complex numbers"},
    {chapter: "CH12", chapterName: "Differential equations"},
    {chapter: "CH13", chapterName: "Momentum and impulse"},
    {chapter: "CH14", chapterName: "Circular motion"},
    {chapter: "CH15", chapterName: "Equilibrium of a rigid body under coplanar forces"},
    {chapter: "CH16", chapterName: "Rotation of a rigid body"},
    {chapter: "CH17", chapterName: "Simple harmonic motion"},
    {chapter: "CH18", chapterName: "Further work on distributions"},
    {chapter: "CH19", chapterName: "Inference using normal and t-distributions"},
    {chapter: "CH20", chapterName: "X2 Test"},
    {chapter: "CH21", chapterName: "Bivariate data"},
    {chapter: "CH22", chapterName: "Projectile motion"},
    {chapter: "CH23", chapterName: "Linear motion under variable force"},
    {chapter: "CH24", chapterName: "Non parametric test"},
    {chapter: "CH25", chapterName: "Continuous random variable"},
    {chapter: "CH26", chapterName: "Probability generating function"},
    {chapter: "CH27", chapterName: "HOOK'S LAW"},
  ],
};

await main(FurtherMath);
