# Google Product Category Classifier

Service that can categorize any website with just a URL, using OpenAI and the Google Product Category taxonomy under the hood.

## Getting Started

Create an `.env` file in the root directory that includes your openai api key e.g.

```
# Do not share your OpenAI API key with anyone! It should remain a secret.
OPENAI_API_KEY=sk-wKob3QlGq9R...
```

Then run

```
npm i
nvm use 18
npm run start
```

And navigate to `localhost:3003/url`, put in a URL and hit enter.

## Other Features

`localhost:3003` provides an index of other features including `/traverse` which facilitates an exploration of the Google Product Category taxonomy

# The Algorithm

## Using OpenAI Model gpt-3.5-turbo and Google Product Categories to Classify Websites in a Structured Way

[Application](https://google-product-categories.herokuapp.com/url) | [Code](https://github.sc-corp.net/jmilgrom/google-product-types)

Starting with a URL, the application retrieves an html document, parses out metadata and categorizes the corresponding website according to the Google Product Categories [Taxonomy](https://www.google.com/basepages/producttype/taxonomy.en-US.txt) (GPCs) using OpenAI. In my testing, it has shown to be shockingly accurate at transforming semi-structured web metadata into structured data, mapping product websites[^1] to an applicable GPC and non-product websites[^2] to `null`.

## Supported Models

The application supports a selection of chat and completion models below gpt-4, eventhough it has been optimized for the chat models (and `gpt-3.5-turbo` in particular) that are [`1/10` the cost](https://platform.openai.com/docs/guides/chat/chat-vs-completions) of similar completion models like `text-davinci-003`.

## Tree Traversal with a Series of Mulitple-Choice Questions

No pretraining on GPCs has been performed. As a result, the LLM must be fed possible GPCs as part of the prompt, increasing the number of tokens and cost. On the other hand, the code can be run locally with your own OpenAI API key and perform just as well as a pretrained LLM. Of course, including all [5595](https://google-product-categories.herokuapp.com/gpc-stats) GPCs with every prompt is exceedingly expensive.[^0] Instead, the algorithm leverages the heirarchical nature of the GPC taxonomy[^8]. Only nodes at a given level in the tree are sent to OpenAI at any given time, and the children of the answer form the next question. The NodeJS runtime descends the GPC tree with OpenAI dictating the path until a GPC is found. For example, a prompt-generater[^3]

```ts
export const generateChatPrompt = (choices: string[], metaTags: string): ChatCompletionRequestMessage[] => [
  {
    role: "system",
    content:
      'You are a multiple-choice test taker. You may select one of the choices that best apply. Please respond with "None of the Above" if none are relevant.',
  },
  {
    role: "user",
    content: `
    Question: Which product category best describes the metadata?

    metadata:
    <meta name="description" content="Buy Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee: Cooking Torches - Amazon.com ✓ FREE DELIVERY possible on eligible purchases">
    <meta name="title" content="Amazon.com: Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee : Home &amp; Kitchen">

    choices: 1) Bathroom Accessories; 2) Business & Home Security; 3) Decor, Emergency Preparedness; 4) Fireplace & Wood Stove Accessories; 5) Fireplaces, Flood, Fire & Gas Safety; 6) Household Appliance Accessories; 7) Household Appliances; 8) Household Supplies; 9) Kitchen & Dining; 10) Lawn & Garden, Lighting; 11) Lighting Accessories; 12) Linens & Bedding; 13) Parasols & Rain Umbrellas; 14) Plants, Pool & Spa; 15) Smoking Accessories; 16) Umbrella Sleeves & Cases; 17) Wood Stoves
  `,
  },
  { role: "assistant", content: "9) Kitchen & Dining" },
  {
    role: "user",
    content: `
    Question: Which product category best describes the metadata?
    metadata:
    ${metaTags}
    choices: \n\t${choices.map((choice, i) => `${i + 1}) ${choice}`).join("\n\t")}
  `,
  },
];
```

<figcaption>This prompt leverages the <a href="https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/#few-shot">"few shot"</a> technique to encourage a consistent response format</figcaption>

that is fed scraped metadata

```html
<meta
  name="description"
  content="The Men’s Pocket Tee. is the latest fit in your lineup of essentials. This supersoft, washed-and-worn basic fits&nbsp;generously through the body with a&nbsp;pocket detail&nbsp;that naturally torques like your favorite vintage tee. Handcrafted locally in L.A., this tee is designed to get (even) more character with age&nbsp;and&nbsp;wear. 50% P"
/>
<meta property="og:title" content="The Men's Pocket Tee. -- Heather Grey" />
<meta
  property="og:description"
  content="The Men’s Pocket Tee. is the latest fit in your lineup of essentials. This supersoft, washed-and-worn basic fits&nbsp;generously through the body with a&nbsp;pocket detail&nbsp;that naturally torques like your favorite vintage tee. Handcrafted locally in L.A., this tee is designed to get (even) more character with age&nbsp;and&nbsp;wear. 50% Polyester, 38% Cotton, 12% Rayon  Machine Wash Cold, Tumble Dry Low&nbsp; Made in the U.S.A."
/>
```

and a set of choices

```ts
[
  "Animals & Pet Supplies",
  "Apparel & Accessories",
  "Arts & Entertainment",
  "Baby & Toddler",
  "Business & Industrial",
  "Cameras & Optics",
  "Electronics",
  "Food,  Beverages & Tobacco",
  "Furniture",
  "Hardware",
  "Health & Beauty",
  "Home & Garden",
  "Luggage & Bags",
  "Mature",
  "Media",
  "Office Supplies",
  "Religious & Ceremonial",
  "Software",
  "Sporting Goods",
  "Toys & Games",
  "Vehicles & Parts",
];
```

can prompt OpenAI with

```html
system: You are a multiple-choice test taker. You may select one of the choices that best apply. Please respond with
"None of the Above" if none are relevant. user: Question: Which product category best describes the metadata? metadata:
<meta
  name="description"
  content="Buy Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee: Cooking Torches - Amazon.com ✓ FREE DELIVERY possible on eligible purchases"
/>
<meta
  name="title"
  content="Amazon.com: Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee : Home &amp; Kitchen"
/>

choices: 1) Bathroom Accessories; 2) Business & Home Security; 3) Decor, Emergency Preparedness; 4) Fireplace & Wood
Stove Accessories; 5) Fireplaces, Flood, Fire & Gas Safety; 6) Household Appliance Accessories; 7) Household Appliances;
8) Household Supplies; 9) Kitchen & Dining; 10) Lawn & Garden, Lighting; 11) Lighting Accessories; 12) Linens & Bedding;
13) Parasols & Rain Umbrellas; 14) Plants, Pool & Spa; 15) Smoking Accessories; 16) Umbrella Sleeves & Cases; 17) Wood
Stoves assistant: 9) Kitchen & Dining user: Question: Which product category best describes the metadata? metadata:
<meta
  name="description"
  content="The Men’s Pocket Tee. is the latest fit in your lineup of essentials. This supersoft, washed-and-worn basic fits&nbsp;generously through the body with a&nbsp;pocket detail&nbsp;that naturally torques like your favorite vintage tee. Handcrafted locally in L.A., this tee is designed to get (even) more character with age&nbsp;and&nbsp;wear. 50% P"
/>
<meta property="og:title" content="The Men's Pocket Tee. -- Heather Grey" />
<meta
  property="og:description"
  content="The Men’s Pocket Tee. is the latest fit in your lineup of essentials. This supersoft, washed-and-worn basic fits&nbsp;generously through the body with a&nbsp;pocket detail&nbsp;that naturally torques like your favorite vintage tee. Handcrafted locally in L.A., this tee is designed to get (even) more character with age&nbsp;and&nbsp;wear. 50% Polyester, 38% Cotton, 12% Rayon  Machine Wash Cold, Tumble Dry Low&nbsp; Made in the U.S.A."
/>

choices: 1) Animals & Pet Supplies; 2) Apparel & Accessories; 3) Arts & Entertainment; 4) Baby & Toddler; 5) Business &
Industrial; 6) Cameras & Optics; 7) Electronics; 8) Food, Beverages & Tobacco; 9) Furniture; 10) Hardware; 11) Health &
Beauty; 12) Home & Garden; 13) Luggage & Bags; 14) Mature; 15) Media; 16) Office Supplies; 17) Religious & Ceremonial;
18) Software; 19) Sporting Goods; 20) Toys & Games; 21) Vehicles & Parts
```

to encourage a response like

```text
2) Apparel & Accessories
```

that can be parsed[^4] into `"Apparel & Accessories"` and matched to a [node](https://google-product-categories.herokuapp.com/traverse?path=Apparel%20%26%20Accessories) on the GPC tree with children

```ts
[
  "Clothing",
  "Clothing Accessories",
  "Costumes & Accessories",
  "Handbag & Wallet Accessories",
  "Handbags,  Wallets & Cases",
  "Jewelry",
  "Shoe Accessories",
  "Shoes",
];
```

in order to form the next prompt to OpenAI

```html
system: You are a multiple-choice test taker. You may select one of the choices that best apply. Please respond with
"None of the Above" if none are relevant. user: Question: Which product category best describes the metadata? metadata:
<meta
  name="description"
  content="Buy Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee: Cooking Torches - Amazon.com ✓ FREE DELIVERY possible on eligible purchases"
/>
<meta
  name="title"
  content="Amazon.com: Kitchen Torch,Cooking Propane Blow Torch Lighter,700,000BTU Flamethrower Fire Gun,Food Culinary Torch with Safety Lock,Campfire Starter Grill Torch,BBQ Torch for Steak &amp; Creme Brulee : Home &amp; Kitchen"
/>

choices: 1) Bathroom Accessories; 2) Business & Home Security; 3) Decor, Emergency Preparedness; 4) Fireplace & Wood
Stove Accessories; 5) Fireplaces, Flood, Fire & Gas Safety; 6) Household Appliance Accessories; 7) Household Appliances;
8) Household Supplies; 9) Kitchen & Dining; 10) Lawn & Garden, Lighting; 11) Lighting Accessories; 12) Linens & Bedding;
13) Parasols & Rain Umbrellas; 14) Plants, Pool & Spa; 15) Smoking Accessories; 16) Umbrella Sleeves & Cases; 17) Wood
Stoves assistant: 9) Kitchen & Dining user: Question: Which product category best describes the metadata? metadata:
<meta
  name="description"
  content="The Men’s Pocket Tee. is the latest fit in your lineup of essentials. This supersoft, washed-and-worn basic fits&nbsp;generously through the body with a&nbsp;pocket detail&nbsp;that naturally torques like your favorite vintage tee. Handcrafted locally in L.A., this tee is designed to get (even) more character with age&nbsp;and&nbsp;wear. 50% P"
/>
<meta property="og:title" content="The Men's Pocket Tee. -- Heather Grey" />
<meta
  property="og:description"
  content="The Men’s Pocket Tee. is the latest fit in your lineup of essentials. This supersoft, washed-and-worn basic fits&nbsp;generously through the body with a&nbsp;pocket detail&nbsp;that naturally torques like your favorite vintage tee. Handcrafted locally in L.A., this tee is designed to get (even) more character with age&nbsp;and&nbsp;wear. 50% Polyester, 38% Cotton, 12% Rayon  Machine Wash Cold, Tumble Dry Low&nbsp; Made in the U.S.A."
/>

choices: 1) Clothing; 2) Clothing Accessories; 3) Costumes & Accessories; 4) Handbag & Wallet Accessories; 5) Handbags,
Wallets & Cases; 6) Jewelry; 7) Shoe Accessories; 8) Shoes;
```

and so on and so forth.

[If the algorithm stops once a leaf-node is reached (i.e. a node with no children), a maximum of 6 requests would be issued to OpenAI and 3 on average, since the longest path has 6 edges and the average has a little over 3.[^7]]

## Leaf Node Granularity Discourages Misclassification

In the GPC taxonomy, each child is a true [subcategory](https://en.wikipedia.org/wiki/Subcategory) of its parent. The farther down the tree, the more specific the set of subcategories. As a result, the semantic distance between the metadata and any incorrect choice increase dramatically at the next level, comprised entirely of more specific examples of the previous choice. An [input of https://espn.com](http://localhost:3003/url?model=default&url=https%3A%2F%2Fespn.com), for example, commonly results in the path `"Sporting Goods"` > `"Athletics"` > `"None of the Above"`, where OpenAI responds with "None of the Above" at level 3, or `"Arts & Entertainment"` > `"None of the Above"`, where OpenAI responds with `"None of the Above"` at level 2, for the scraped metadata:

```html
<meta
  name="description"
  content="Visit ESPN for live scores, highlights and sports news. Stream exclusive games on ESPN+ and play fantasy sports."
/>
<meta name="title" content="ESPN - Serving Sports Fans. Anytime. Anywhere." />
<meta property="og:title" content="ESPN - Serving Sports Fans. Anytime. Anywhere." />
<meta
  property="og:description"
  content="Visit ESPN for live scores, highlights and sports news. Stream exclusive games on ESPN+ and play fantasy sports."
/>
```

"Sportings Goods" and "Athletics" thereafter seem like fine choices until presented with the subcategories of "Athletics",

```text
1) American Football; 2) Baseball & Softball; 3) Basketball; 4) Boxing & Martial Arts; 5) Broomball Equipment; 6) Cheerleading; 7) Coaching & Officiating; 8) Cricket; 9) Dancing; 10) Fencing; 11) Field Hockey & Lacrosse; 12) Figure Skating & Hockey; 13) General Purpose Athletic Equipment; 14) Gymnastics; 15) Racquetball & Squash; 16) Rounders; 17) Rugby; 18) Soccer; 19) Team Handball; 20) Tennis; 21) Track & Field; 22) Volleyball; 23) Wallyball Equipment; 24) Water Polo; 25) Wrestling
```

as does "Art & Entertainment" until presented with the subcategories

```text
1) Event Tickets; 2) Hobbies & Creative Arts; 3) Party & Celebration
```

OpenAI recognizes the mistaken path before reaching a leaf node and correctly responds with `"None of the Above"` in either case.

## Final Thoughts

The orchestration is provided by an ordinary programming runtime, in this case NodeJS; There is no BabyAGI or some other LangChain application whereby the LLM replaces a programming runtime as the ultimate

[^0]: And perhaps even impossible given token limits per prompts - I haven't even tried .
[^1]: For example, a [t-shirt](https://google-product-categories.herokuapp.com/url?url=https%3A%2F%2Fthisisthegreat.com%2Fcollections%2Fthe-great-man%2Fproducts%2Fthe-mens-pocket-tee-heather-grey&model=default).
[^2]: For example, a [news site](https://google-product-categories.herokuapp.com/url?url=https%3A%2F%2Fespn.com&model=default).
[^3]: This [prompt generator](https://github.sc-corp.net/jmilgrom/google-product-types/blob/main/src/openai/index.ts#L89) comforms to the [chat-completion API](https://github.com/openai/openai-node/blob/master/api.ts#L31) of OpenAI's NodeJS client. Notice how a final `{role: "assistant", ...}` object is, in a sense, left off of the end of the prompt array, since the underlying LLM plays the role of "assistant" and should fill-in this value as its response.
[^4]: By slicing off a space-delimited prefix.
[^5]: A garbage-collected, single-threaded, runtime with native async support via an event-loop on top of a CPU/Memory model with an intermediating OS, etc., etc. Please for the love of god, don't go away traditional programming model, you are so much fun!
[^7]: [GPC stats](https://google-product-categories.herokuapp.com/gpc-stats) | [code](https://github.sc-corp.net/jmilgrom/google-product-types/blob/main/src/index.ts#L74).
[^8]: There are [21 root sibling nodes](https://google-product-categories.herokuapp.com/traverse) (`"Animals & Pet Supplies"`, ..., `"Vehicles & Parts"`) and each node may have children nodes.
