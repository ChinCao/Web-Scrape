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
const IGCSE_Physics = {
  curriculum: "IGCSE",
  subject: "Physics(0625)",
  topics: [
    {chapter: "CH1", chapterName: "MEASUREMENTS AND UNITS"},
    {chapter: "CH2", chapterName: "FORCES AND MOTION"},
    {chapter: "CH3", chapterName: "FORCES AND PRESSURE"},
    {chapter: "CH4", chapterName: "FORCES AND ENERGY"},
    {chapter: "CH5", chapterName: "THERMAL EFFECTS"},
    {chapter: "CH6", chapterName: "WAVES AND SOUNDS"},
    {chapter: "CH7", chapterName: "RAYS AND WAVES"},
    {chapter: "CH8", chapterName: "ELECTRICITY"},
    {chapter: "CH9", chapterName: "MAGNETS AND CURRENTS"},
    {chapter: "CH10", chapterName: "ELECTRON AND ELECTRONICS"},
    {chapter: "CH11", chapterName: "ATOMS AND RADIOACTIVITY"},
    {chapter: "CH12", chapterName: "SPACE PHYSICS"},
  ],
};
const IGCSE_Mathematics = {
  curriculum: "IGCSE",
  subject: "Mathematics(0580)",
  topics: [
    {chapter: "CH1", chapterName: "DECIMALS"},
    {chapter: "CH2", chapterName: "NUMBER FACTS"},
    {chapter: "CH3", chapterName: "RATIONAL AND IRRATIONAL NUMBERS"},
    {chapter: "CH4", chapterName: "APPROXIMATION AND ESTIMATION"},
    {chapter: "CH5", chapterName: "UPPER AND LOWER BOUND"},
    {chapter: "CH6", chapterName: "STANDARD FORM"},
    {chapter: "CH7", chapterName: "RATIO AND PROPORTION"},
    {chapter: "CH8", chapterName: "FOREIGN EXCHANGE"},
    {chapter: "CH9", chapterName: "MAP SCALES"},
    {chapter: "CH10", chapterName: "PERCENTAGES"},
    {chapter: "CH11", chapterName: "SIMPLE AND COMPOUND INTEREST"},
    {chapter: "CH12", chapterName: "SPEED, DISTANCE AND TIME"},
    {chapter: "CH13", chapterName: "FORMULAE"},
    {chapter: "CH14", chapterName: "BRACKETS AND SIMPLIFYING"},
    {chapter: "CH15", chapterName: "LINEAR EQUATIONS"},
    {chapter: "CH16", chapterName: "SIMULTANEOUS EQUATIONS"},
    {chapter: "CH17", chapterName: "FACTORISING"},
    {chapter: "CH18", chapterName: "QUADRATIC EQUATIONS"},
    {chapter: "CH19", chapterName: "CHANGING THE SUBJECT"},
    {chapter: "CH20", chapterName: "VARIATION"},
    {chapter: "CH21", chapterName: "INDICES"},
    {chapter: "CH22", chapterName: "SOLVING INEQUALITIES"},
    {chapter: "CH23", chapterName: "MENSURATION"},
    {chapter: "CH24", chapterName: "POLYGONS"},
    {chapter: "CH25", chapterName: "PARALLEL LINES"},
    {chapter: "CH26", chapterName: "PYTHAGORAS THEOREM"},
    {chapter: "CH27", chapterName: "SYMMETRY"},
    {chapter: "CH28", chapterName: "SIMILARITY"},
    {chapter: "CH29", chapterName: "CONGRUENCE"},
    {chapter: "CH30", chapterName: "AREAS & VOLUMES OF SIMILAR SHAPES"},
    {chapter: "CH31", chapterName: "CIRCLE THEOREM"},
    {chapter: "CH32", chapterName: "CONSTRUCTIONS AND LOCI"},
    {chapter: "CH33", chapterName: "TRIGONOMETRY"},
    {chapter: "CH34", chapterName: "LINES"},
    {chapter: "CH35", chapterName: "PLOTTING CURVES"},
    {chapter: "CH36", chapterName: "GRAPHICAL SOLUTION OF EQUATIONS"},
    {chapter: "CH37", chapterName: "DISTANCE-TIME GRAPHS"},
    {chapter: "CH38", chapterName: "SPEED-TIME GRAPHS"},
    {chapter: "CH39", chapterName: "SETS"},
    {chapter: "CH40", chapterName: "VECTORS"},
    {chapter: "CH41", chapterName: "MATRICES"},
    {chapter: "CH42", chapterName: "TRANSFORMATION"},
    {chapter: "CH43", chapterName: "STATISTICS"},
    {chapter: "CH44", chapterName: "PROBABILITY"},
    {chapter: "CH45", chapterName: "FUNCTIONS"},
    {chapter: "CH47", chapterName: "LINEAR PROGRAMMING"},
    {chapter: "CH48", chapterName: "SEQUENCES"},
    {chapter: "CH49", chapterName: "ANGLES"},
    {chapter: "CH50", chapterName: "NET"},
    {chapter: "CH51", chapterName: "DIFFERENTIATION"},
  ],
};
const IGCSE_Chemistry = {
  curriculum: "IGCSE",
  subject: "Chemistry(0620)",
  topics: [
    {chapter: "CH1", chapterName: "STATES OF MATTER"},
    {chapter: "CH2", chapterName: "SEPARATING SUBSTANCES"},
    {chapter: "CH3", chapterName: "ATOMS AND ELEMENTS"},
    {chapter: "CH4", chapterName: "ATOMS COMBINING"},
    {chapter: "CH5", chapterName: "REACTING MASSES AND CHEMICAL EQUATIONS"},
    {chapter: "CH6", chapterName: "USING MOLES"},
    {chapter: "CH7", chapterName: "REDOX REACTIONS"},
    {chapter: "CH8", chapterName: "ELECTRICITY AND CHEMICAL CHANGES"},
    {chapter: "CH9", chapterName: "ENERGY CHANGES AND REVERSIBLE REACTIONS"},
    {chapter: "CH10", chapterName: "THE SPEED OF A REACTION"},
    {chapter: "CH11", chapterName: "ACIDS AND BASES"},
    {chapter: "CH12", chapterName: "THE PERIODIC TABLE"},
    {chapter: "CH13", chapterName: "THE BEHAVIOR OF METALS"},
    {chapter: "CH14", chapterName: "MAKING USE OF METALS"},
    {chapter: "CH15", chapterName: "AIR AND WATER"},
    {chapter: "CH16", chapterName: "SOME NON-METALS AND THEIR COMPOUNDS"},
    {chapter: "CH17", chapterName: "ORGANIC CHEMISTRY"},
    {chapter: "CH18", chapterName: "POLYMERS"},
    {chapter: "CH19", chapterName: "IN THE LAB (CHEMICAL TEST & SALT ANALYSIS)"},
  ],
};

const IGCSE_Biology = {
  curriculum: "IGCSE",
  subject: "Biology(0610)",
  topics: [
    {chapter: "CH1", chapterName: "CHARACTERISTICS AND CLASSIFICATION OF LIVING ORGANISMS"},
    {chapter: "CH2", chapterName: "ORGANIZATION AND MAINTENANCE OF THE ORGANISM"},
    {chapter: "CH3", chapterName: "MOVEMENT IN AND OUT OF CELLS"},
    {chapter: "CH4", chapterName: "BIOLOGICAL MOLECULES"},
    {chapter: "CH5", chapterName: "ENZYMES"},
    {chapter: "CH6", chapterName: "PLANT NUTRITION"},
    {chapter: "CH7", chapterName: "HUMAN NUTRITION"},
    {chapter: "CH8", chapterName: "TRANSPORT IN PLANTS"},
    {chapter: "CH9", chapterName: "TRANSPORT IN ANIMALS"},
    {chapter: "CH10", chapterName: "DISEASES AND IMMUNITY"},
    {chapter: "CH11", chapterName: "GAS EXCHANGE IN HUMANS"},
    {chapter: "CH12", chapterName: "RESPIRATION"},
    {chapter: "CH13", chapterName: "EXCRETION IN HUMANS"},
    {chapter: "CH14", chapterName: "CO-ORDINATION AND RESPONSE"},
    {chapter: "CH15", chapterName: "DRUGS"},
    {chapter: "CH16", chapterName: "REPRODUCTION"},
    {chapter: "CH17", chapterName: "INHERITANCE"},
    {chapter: "CH18", chapterName: "VARIATION AND SELECTION"},
    {chapter: "CH19", chapterName: "ORGANISMS AND THEIR ENVIRONMENT"},
    {chapter: "CH20", chapterName: "BIOTECHNOLOGY AND GENETIC ENGINEERING"},
    {chapter: "CH21", chapterName: "HUMAN INFLUENCES ON ECOSYSTEMS"},
  ],
};
const IGCSE_ScienceCoordinate = {
  curriculum: "IGCSE",
  subject: "Science Coordinate(0654)",
  topics: [
    {chapter: "CH1", chapterName: "B1 - Characteristics of living organisms"},
    {chapter: "CH2", chapterName: "B2 - Cells"},
    {chapter: "CH3", chapterName: "B3 - Biological molecules"},
    {chapter: "CH4", chapterName: "B4 - Enzymes"},
    {chapter: "CH5", chapterName: "B5 - Plant nutrition"},
    {chapter: "CH6", chapterName: "B6 - Animal nutrition"},
    {chapter: "CH7", chapterName: "B7 - Transport"},
    {chapter: "CH8", chapterName: "B8 - Gas exchange and respiration"},
    {chapter: "CH9", chapterName: "B9 - Coordination and response"},
    {chapter: "CH10", chapterName: "B10 - Reproduction"},
    {chapter: "CH11", chapterName: "B11 - Inheritance"},
    {chapter: "CH12", chapterName: "B12 - Organisms and their environment"},
    {chapter: "CH13", chapterName: "B13 - Human influences on ecosystems"},
    {chapter: "CH14", chapterName: "C1 - The particulate nature of matter"},
    {chapter: "CH15", chapterName: "C2 - Experimental techniques"},
    {chapter: "CH16", chapterName: "C3 - Atoms, elements and compounds"},
    {chapter: "CH17", chapterName: "C4 - Stoichiometry"},
    {chapter: "CH18", chapterName: "C5 - Electricity and chemistry"},
    {chapter: "CH19", chapterName: "C6 - Energy changes in chemical reactions"},
    {chapter: "CH20", chapterName: "C7 - Chemical reactions"},
    {chapter: "CH21", chapterName: "C8 - Acids, bases and salts"},
    {chapter: "CH22", chapterName: "C9 - The Periodic Table"},
    {chapter: "CH23", chapterName: "C10 - Metals"},
    {chapter: "CH24", chapterName: "C11 - Air and water"},
    {chapter: "CH25", chapterName: "C12 - Sulfur"},
    {chapter: "CH26", chapterName: "C13 - Carbonates"},
    {chapter: "CH27", chapterName: "C14 - Organic chemistry"},
    {chapter: "CH28", chapterName: "P1 - Motion"},
    {chapter: "CH29", chapterName: "P2 - Work, energy and power"},
    {chapter: "CH30", chapterName: "P3 - Thermal physics"},
    {chapter: "CH31", chapterName: "P4 - Properties of waves, including light and sound"},
    {chapter: "CH32", chapterName: "P5 - Electricity and magnetism"},
    {chapter: "CH33", chapterName: "P6 - Electric circuits"},
    {chapter: "CH34", chapterName: "P7 - Electromagnetic effects"},
    {chapter: "CH35", chapterName: "P8 - Atomic physics"},
  ],
};

const IGCSE_ScienceCombined = {
  curriculum: "IGCSE",
  subject: "Science Combined(0653)",
  topics: [
    {chapter: "CH1", chapterName: "B1 - Characteristics of living organisms"},
    {chapter: "CH2", chapterName: "B2 - Cells"},
    {chapter: "CH3", chapterName: "B3 - Biological molecules"},
    {chapter: "CH4", chapterName: "B4 - Enzymes"},
    {chapter: "CH5", chapterName: "B5 - Plant nutrition"},
    {chapter: "CH6", chapterName: "B6 - Animal nutrition"},
    {chapter: "CH7", chapterName: "B7 - Transport"},
    {chapter: "CH8", chapterName: "B8 - Gas exchange and respiration"},
    {chapter: "CH9", chapterName: "B9 - Coordination and response"},
    {chapter: "CH10", chapterName: "B10 - Reproduction"},
    {chapter: "CH11", chapterName: "B11 - Organisms and their environment"},
    {chapter: "CH12", chapterName: "B12 - Human influences on ecosystems"},
    {chapter: "CH13", chapterName: "C1 - The particulate nature of matter"},
    {chapter: "CH14", chapterName: "C2 - Experimental techniques"},
    {chapter: "CH15", chapterName: "C3 - Atoms, elements and compounds"},
    {chapter: "CH16", chapterName: "C4 - Stoichiometry"},
    {chapter: "CH17", chapterName: "C5 - Electricity and chemistry"},
    {chapter: "CH18", chapterName: "C6 - Energy changes in chemical reactions"},
    {chapter: "CH19", chapterName: "C7 - Chemical reactions"},
    {chapter: "CH20", chapterName: "C8 - Acids, bases and salts"},
    {chapter: "CH21", chapterName: "C9 - The Periodic Table"},
    {chapter: "CH22", chapterName: "C10 - Metals"},
    {chapter: "CH23", chapterName: "C11 - Air and water"},
    {chapter: "CH24", chapterName: "C12 - Organic chemistry"},
    {chapter: "CH25", chapterName: "P1 - Motion"},
    {chapter: "CH26", chapterName: "P2 - Work, energy and power"},
    {chapter: "CH27", chapterName: "P3 - Thermal Physics"},
    {chapter: "CH28", chapterName: "P4 - Properties of waves, including light and sound"},
    {chapter: "CH29", chapterName: "P5 - Electrical quantities"},
    {chapter: "CH30", chapterName: "P6 - Electric circuits"},
  ],
};
const IGCSE_ESL2 = {
  curriculum: "IGCSE",
  subject: "English 2nd Language(0510)",
  topics: [
    {chapter: "CH1", chapterName: "READING"},
    {chapter: "CH2", chapterName: "SUMMARY"},
    {chapter: "CH3", chapterName: "LETTER - EMAIL"},
    {chapter: "CH4", chapterName: "ARTICLE"},
  ],
};
const ComputerScience1 = {
  curriculum: "A-LEVEL",
  subject: "Computer Science (from 2021)(9618)",
  topics: [
    {chapter: "CH1", chapterName: "Information Representation"},
    {chapter: "CH2", chapterName: "Communication"},
    {chapter: "CH3", chapterName: "Hardware"},
    {chapter: "CH4", chapterName: "Processor Fundamentals"},
    {chapter: "CH5", chapterName: "System Software (OS)"},
    {chapter: "CH6", chapterName: "Security, Privacy and Data Integrity"},
    {chapter: "CH7", chapterName: "Ethics and Ownership"},
    {chapter: "CH8", chapterName: "Databases"},
    {chapter: "CH9", chapterName: "Algorithm Design and Problem-Solving"},
    {chapter: "CH10", chapterName: "Data Types and Structures"},
    {chapter: "CH11", chapterName: "Programming"},
    {chapter: "CH12", chapterName: "Software Development"},
    {chapter: "CH13", chapterName: "Data Representation"},
    {chapter: "CH14", chapterName: "Communication and Internet Technologies"},
    {chapter: "CH15", chapterName: "Hardware and Virtual Machines"},
    {chapter: "CH16", chapterName: "System Software (Purposes of an OS)"},
    {chapter: "CH17", chapterName: "Security"},
    {chapter: "CH18", chapterName: "Artificial Intelligence (AI)"},
    {chapter: "CH19", chapterName: "Computational Thinking and Problem Solving"},
    {chapter: "CH20", chapterName: "Further Programming"},
  ],
};
const ComputerScience2 = {
  curriculum: "A-LEVEL",
  subject: "Computer Science(9608)",
  topics: [
    {chapter: "CH1", chapterName: "Information Representation"},
    {chapter: "CH2", chapterName: "Communication and Internet Technologies"},
    {chapter: "CH3", chapterName: "Hardware"},
    {chapter: "CH4", chapterName: "Processor Fundamentals"},
    {chapter: "CH5", chapterName: "System Software"},
    {chapter: "CH6", chapterName: "Security, Privacy and Data Integrity"},
    {chapter: "CH7", chapterName: "Ethics and Ownership"},
    {chapter: "CH8", chapterName: "Database and Data Modeling"},
    {chapter: "CH9", chapterName: "Algorithm Design and Problem-Solving"},
    {chapter: "CH10", chapterName: "Data Representation"},
    {chapter: "CH11", chapterName: "Programming"},
    {chapter: "CH12", chapterName: "Software Development"},
    {chapter: "CH13", chapterName: "Monitoring and Control Systems"},
  ],
};

await main(IGCSE_Chemistry);
