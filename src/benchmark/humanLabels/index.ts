import { Parser, parse } from "csv-parse";
import fs from "fs";
import { Precision } from "../constants";
import minimist from "minimist";
import { HEADER, Row, parsePrecision, parseString } from "../schema";

const LABELS_FILE_NAME = "labels.json";

const readCSV = (filePath: string): Parser => {
  return fs.createReadStream(filePath).pipe(
    parse({
      // relax_quotes: true
    })
  );
};

type Labels = {
  [url: string]: { [category: string]: Precision[] };
};

const labels: Labels = JSON.parse(fs.readFileSync(`${__dirname}/${LABELS_FILE_NAME}`, "utf-8"));

const numUrlsBefore = Object.keys(labels).length;

const args = minimist(process.argv.slice(2));

const source = args.source;

if (typeof source !== "string" || !source.length) {
  console.log(`source=${source}`);
  throw new Error("Set --source to indicate the source csv path");
}

const parser = readCSV(source);

const urlIndex = HEADER.indexOf("url");
const gpcIndex = HEADER.indexOf("gpc");
const gpcQualityIndex = HEADER.indexOf("gpc_quality");

const parseBenchmark = (row: Row): { url: string; gpc: string | null; gpcQuality: Precision | null } => {
  const [url, gpc, gpcQuality] = [
    parseString(row[urlIndex]),
    parseString(row[gpcIndex]),
    parsePrecision(row[gpcQualityIndex]),
  ];
  if (url === null) {
    throw new Error("Url is undefined.");
  }
  return {
    url,
    gpc,
    gpcQuality,
  } as const;
};

if ([urlIndex, gpcIndex, gpcQualityIndex].some((v) => v === -1)) {
  throw new Error("Index not found.");
}

(async () => {
  let i = 0;
  for await (const result of parser) {
    if (i === 0) {
      i++;
      continue; // skip header
    }
    console.log(`Parsing row ${i}`);
    const { url, gpc, gpcQuality } = parseBenchmark(result);
    i++;

    if (gpc === null) {
      console.log(`gpc is null for ${url}`);
      continue;
    }
    if (gpcQuality === null) {
      console.log(`gpcQuality is null for ${url}`);
      continue;
    }

    labels[url] = labels[url] ?? {};
    const precision = new Set(labels[url][gpc] ?? []);
    precision.add(gpcQuality);
    labels[url][gpc] = Array.from(precision);
  }

  console.log("Done");

  const numUrlsAfter = Object.keys(labels).length;

  console.log(`Number of keys before run: ${numUrlsBefore}`);
  console.log(`Number of keys after run: ${numUrlsAfter}`);

  fs.writeFileSync(`${__dirname}/${LABELS_FILE_NAME}`, JSON.stringify(labels));
})();
