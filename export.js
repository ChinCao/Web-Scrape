import fs from "fs";

// Your variable
const data = {
  question: [
    [
      "https://qnpumhfafqmcymbxzuvc.functions.supabase.co/get-image?url=https://exam-mate.com/media/questions/399866/9702_s23_qp_12_Q1.png",
      "9702_s23_qp_12_Q1",
    ],
    // ... (other entries)
  ],
  markScheme: [
    ["A", "9702_s23_ms_12_Q1"],
    // ... (other entries)
  ],
};

// Convert the variable to a JSON string
const jsonData = JSON.stringify(data, null, 2); // Pretty print with 2 spaces

// Write the JSON string to a file
fs.writeFileSync("output.txt", jsonData, "utf8");

console.log("Data exported to output.txt");
