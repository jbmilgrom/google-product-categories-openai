import fs from "fs";
import { Parser, parse } from "csv-parse";
import { chatOpenaiEmbeddings } from "../chatOpenaiEmbeddings";
import { getGoogleProductCategoriesTaxonomy } from "../googleProducts";
import { Vertices } from "../utils/tree";
import { assertUnreachable } from "../utils/assertUnreachable";
import { ADA_002_EMBEDDING_MODEL } from "../openai";
import { HEADER, createRow, parsePrevious } from "./schema";

const RESOURCE_DIR = "resources";
const GOLDEN_SET_BENCHMARK = "google_category_label_set_ad_3_5.csv";

const readCSV = (filePath: string): Parser => {
  return fs.createReadStream(filePath).pipe(
    parse({
      /* CSV options */
    })
  );
};

const testId = new Date().getTime();

(async () => {
  let nodes: Vertices<string>;
  try {
    console.log("Parsing google product categories into tree...");
    nodes = await getGoogleProductCategoriesTaxonomy();
  } catch (e) {
    console.log("Error parsing google product categories", e);
    return;
  }

  const parser = readCSV(`${__dirname}/${RESOURCE_DIR}/${GOLDEN_SET_BENCHMARK}`);

  const writer = fs.createWriteStream(`${__dirname}/${RESOURCE_DIR}/test_${testId}.csv`);

  const writeRow = (row: ReadonlyArray<string>): void => {
    writer.write(row.join(", "));
    writer.write("\n");
  };

  writeRow(HEADER);

  for await (const result of parser) {
    const previous = parsePrevious(result);

    try {
      console.log(`Benchmarking ${previous.url}`);
      const { type, categories, metadata } = await chatOpenaiEmbeddings(nodes, previous.html, { k: 5 });

      const subjectMetadata = {
        url: previous.url,
        htmlMetadata: previous.html,
      } as const;
      const previousMetadata = {
        gpc: previous.gpc,
        humanGpc: previous.gpcResult,
        gpcQuality: previous.gpcQuality,
        htmlQuality: previous.htmlContent,
      } as const;
      const resultMetadata = {
        model: ADA_002_EMBEDDING_MODEL,
        chatModel: metadata.model,
        k: metadata.similaritySearch.k,
        topKWithScore: metadata.similaritySearch.top,
        transcript: metadata.transcript,
      } as const;

      switch (type) {
        case "success": {
          console.log("Success. Writing Row.");
          writeRow(
            createRow(subjectMetadata, previousMetadata, {
              ...resultMetadata,
              gpc: categories,
            })
          );
          continue;
        }
        case "error:NoCategoryFound": {
          console.log("No Category Found. Writing Row.");

          writeRow(
            createRow(subjectMetadata, previousMetadata, {
              ...resultMetadata,
              gpc: null,
            })
          );
          continue;
        }
        default:
          return assertUnreachable(type);
      }
    } catch (e) {
      console.log("Something went wrong.", e);
    }
  }
  console.log("Done");
})();
