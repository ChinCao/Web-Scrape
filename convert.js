import fs from "fs";
import pdf from "pdfkit";
import sizeOf from "image-size";

const imageDirectory = "./images";
export const convertPDF = async () => {
  fs.readdir(imageDirectory, async (err, files) => {
    const dimensions = sizeOf(
      `${imageDirectory}/${files.filter((file) => file.endsWith(".png"))[1]}`
    );

    const doc = new pdf({
      size: [dimensions.width, dimensions.height],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    doc.pipe(fs.createWriteStream("output.pdf"));
    let minValue = Infinity;
    let maxValue = -Infinity;
    if (err) {
      return console.error("Unable to scan directory: " + err);
    }

    files.forEach((file) => {
      if (file.endsWith(".png")) {
        const num = parseInt(file.slice(0, -4), 10);
        if (num) {
          if (num < minValue) {
            minValue = num;
          } else if (num > maxValue) {
            maxValue = num;
          }
        }
      }
    });
    doc.image(`./images/${minValue}.png`, {
      cover: [dimensions.width, dimensions.height],
      align: "center",
      valign: "center",
    });
    for (let i = minValue + 1; i <= maxValue; i++) {
      doc.addPage().image(`./images/${i}.png`, {
        cover: [dimensions.width, dimensions.height],
        align: "center",
        valign: "center",
      });
    }

    doc.end();
  });
};

convertPDF();
