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
