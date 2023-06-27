import express from "express";
import { makeQueue, find, getValues, forEachBreadthFirst } from "./utils/tree";
import { getGoogleProductCategoriesTaxonomy, getPath, makeGoogleProductTypeTextLineIterator } from "./googleProducts";
import { cookieTrailTemplate, footerTemplate, homeTemplate, htmlTemplate, linkTemplate, routeList } from "./templates";
import { ROUTES } from "./routes";
import { configureGraphTraversalRoute } from "./pages/graphTraversal";

const app = express();

/**
 * These configurations are needed to be receive form data in POST methods
 *
 * @see https://stackoverflow.com/a/12008719/3645851
 * @see https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT /* needed for Heroku deployment */ ?? 3003;

// this needs to be a character that does not appear in a google product category name (e.g. "," won't work properly)
const QUERY_PARAM_DELIMITER = "_";

app.get("/", async (req, res) => {
  res.set("Content-Type", "text/html");
  res.send(
    Buffer.from(
      htmlTemplate(/*html*/ `
    <h1>Explore Google Product Types</h1>
    <ul>
      ${routeList(ROUTES)}
    </ul>
    ${footerTemplate()}
  `)
    )
  );
});

app.get(ROUTES.URL.url, async (req, res) => {
  res.set("Content-Type", "text/html");
  res.send(
    Buffer.from(
      htmlTemplate(
        homeTemplate(/*html*/ `
    <h1>Search Strategies</h1>
    <ul>
      ${routeList(ROUTES.URL.ROUTES)}
    </ul>
    ${footerTemplate()}
  `)
      )
    )
  );
});

app.get(ROUTES.TEXT.url, async (req, res) => {
  console.log(`fetching google product type...`);
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    res.write(`${line}\n`);
  }
  res.end();
});

app.get(ROUTES.INTERNAL_REPRESENTATION.url, async (req, res) => {
  console.log(`fetching google product type...`);
  const nodes = await getGoogleProductCategoriesTaxonomy();
  res.send(nodes);
});

app.get(ROUTES.GPC_STATS.url, async (req, res) => {
  console.log("calculating stats...");

  const nodes = await getGoogleProductCategoriesTaxonomy();

  let [token, maxDeg] = ["", 0];
  let [nodeCount, levelCount] = [0, 0];
  let [leafNodeCount, leafNodeLevelCount] = [0, 0];
  let maxLevels = 0;
  forEachBreadthFirst(nodes, (node, level) => {
    nodeCount++;
    levelCount = levelCount + level;
    maxLevels = maxLevels > level ? maxLevels : level;
    const numChildren = node.children.length;
    if (!numChildren) {
      leafNodeCount++;
      leafNodeLevelCount = leafNodeLevelCount + level;
    }

    if (numChildren > maxDeg) {
      maxDeg = numChildren;
      token = node.value;
    }
  });

  const levelToEdge = (level: number) => level - 1;

  res.set("Content-Type", "text/html");
  res.send(
    Buffer.from(
      htmlTemplate(
        homeTemplate(/*html*/ `
      <h1>Stats</h1>
      <p>Total Google Product Categories (i.e. the count of all nodes): ${nodeCount}</p>
      <p>The category "${token}" has the highest degree: ${maxDeg}</p>
      <h2>Path Length (Measured in Edges)</h2>
      <p>Longest path: ${levelToEdge(maxLevels)}</p>
      <p>Average path of leaf nodes: ${levelToEdge(leafNodeLevelCount / leafNodeCount).toFixed(2)}</p>
      <p>Average path of all nodes: ${levelToEdge(levelCount / nodeCount).toFixed(2)}</p>
      `)
      )
    )
  );
});

app.get(ROUTES.TRAVERSE.url, async (req, res) => {
  console.log("calculating children...");

  const nodes = await getGoogleProductCategoriesTaxonomy();
  try {
    const pathString = (req.query.path as string) ?? null;
    const path = pathString ? getPath(pathString, { delimitingChar: QUERY_PARAM_DELIMITER }) : makeQueue<string>();
    const node = find(nodes, { path: path.copy() });
    const children = node?.children ?? nodes;
    const pathList = path.toList();
    const childrenList = getValues(children);

    res.set("Content-Type", "text/html");
    res.send(
      Buffer.from(
        htmlTemplate(
          homeTemplate(/*html*/ `
      <h2>Path</h2>
      <div>
        <span>${pathList.length ? `<a href=${ROUTES.TRAVERSE.url}>Root</a><span> > </span>` : "Root"}</span>
        ${cookieTrailTemplate(ROUTES.TRAVERSE.url, pathList, { delimiter: QUERY_PARAM_DELIMITER })}
      </div>
      <h2>Next</h2>
      ${childrenList.length === 0 ? `<div><span>Leaf Node &#127809;</span></div>` : ""}
      <ul>
        ${childrenList
          .map(
            (value) =>
              `<li>
                ${linkTemplate(ROUTES.TRAVERSE.url, [...pathList, value], {
                  delimiter: QUERY_PARAM_DELIMITER,
                })}
              </li>`
          )
          .join("")}
      </ul>
    `)
        )
      )
    );
  } catch {
    res.send("error parsing path. Make sure path is comma delimited");
  }
});

app.get(ROUTES.SEARCH.url, async (req, res) => {
  console.log("searching...");
  res.set("Content-Type", "text/html");

  const term = (req.query.term as string) ?? null;
  if (!term) {
    res.send(
      Buffer.from(
        htmlTemplate(
          homeTemplate(/*html*/ `
          <h1>Instructions</h1>
          <p>Add a valid query parameter of form "?term=MY_SEARCH_TERM" to the url and hit enter.</P>
        `)
        )
      )
    );
    return;
  }

  const lineMatches = [];
  for await (const line of makeGoogleProductTypeTextLineIterator()) {
    if (line.toLocaleLowerCase().includes(term.toLocaleLowerCase())) {
      lineMatches.push(line);
    }
  }

  res.send(
    Buffer.from(
      htmlTemplate(
        homeTemplate(/*html*/ `
    <h1>Search Results</h1>
    ${
      !lineMatches.length
        ? "<p>No Results</p>"
        : `<ul>
        ${lineMatches
          .map((match) => {
            const categories = match.split(">").map((s) => s.trim());
            return `
              <li>
                ${cookieTrailTemplate(ROUTES.TRAVERSE.url, categories, { delimiter: QUERY_PARAM_DELIMITER })}
              </li>`;
          })
          .join("")}
      </ul>`
    }
  `)
      )
    )
  );
});

configureGraphTraversalRoute(app, {
  route: ROUTES.URL.ROUTES.GRAPH_TRAVERSAL.url,
  queryParamDelimiter: QUERY_PARAM_DELIMITER,
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
