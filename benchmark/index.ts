import fs from "fs";
import { parse } from "csv-parse";

import { dirname } from "path";
import { fileURLToPath } from "url";

const RESOURCE_DIR = "resources";
const GOLDEN_SET_BENCHMARK = "google_category_label_set_ad_3_5.csv";

// const __dirname = dirname(fileURLToPath(import.meta.url));

const processFile = async () => {
  const records = [];
  const parser = fs.createReadStream(`${__dirname}/${RESOURCE_DIR}/${GOLDEN_SET_BENCHMARK}`).pipe(
    parse({
      // CSV options if any
    })
  );
  for await (const record of parser) {
    console.info("record", record);
    // Work with each record
    records.push(record);
  }
  return records;
};

(async () => {
  const records = await processFile();
  console.log("Done");
})();
