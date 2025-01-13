export function PaperParser(original) {
  let modified = undefined;

  const strCopy = original.slice();

  const year = strCopy.split("_")[2];
  const season = strCopy.split("_")[1];

  const number = parseInt(strCopy.split("/")[1].split("_")[0]);
  const multipleOf10 = Math.floor(number / 10);
  if (original.includes("Summer")) {
    modified = original.replace("Summer", "MJ");
  } else if (original.includes("Winter")) {
    modified = original.replace("Winter", "ON");
  }
  modified = modified.replace(/_(\d{4})/, (_, year) => `/${year.slice(-2)}`);

  let parts = modified.split("_");
  modified = parts[0] + "/" + parts[1];
  modified = modified.replace(/\//g, "_");

  return {
    question_paper: modified.trim(),
    question: parts[2].trim(),
    season,
    year,
    paper: multipleOf10,
  };
}
