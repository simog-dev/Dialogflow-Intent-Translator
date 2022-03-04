# Dialogflow-Intent-Translator

This script translate the trining phrases of Dialogflow intents from a language to another, using DeepL Free API.

It takes care of the entities used to mark the phrases.

This script produce, for every intent, a JSON file containing the request to send for "IntentBatchUpdate".(https://cloud.google.com/dialogflow/es/docs/reference/rest/v2/projects.agent.intents/batchUpdate)

## Installation

Install dependencies.

```bash
npm install
```

## Usage
1. Put inside the "data" folder the intents files[1].
2. Open "index.js" and change the value of the variable "KEY" using your DeepL API KEY; "target_lang" and "source_lang" with your preferences.
3. Start the script using 
```bash
node index.js
```
4. Translation file will be available in the "translation" folder.


[1] Export your agent from Dialogflow and select the intent you want to translate from the "intents" folder. You have to put all the files relative to the intent ("intent_name.json" and "intent_name_usersay_[your lang].json")

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.
