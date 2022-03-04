'use strict';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const dir = './data';
const filesFound = [];
import translate from 'deepl';
let start_index = 0;

//############ Parameters to change ###############
const KEY = 'YOUR_API_KEY';
const target_lang = 'EN';
const source_lang = 'IT';

async function translateSentence(sentenceArr, index) {
  let len = sentenceArr.length;
  let el = sentenceArr;
  if (el[index].hasOwnProperty('text')) {
    translate({
      free_api: true,
      text: el[index].text,
      target_lang: target_lang,
      source_lang: source_lang,
      auth_key: KEY,
      tag_handling: 'xml',
      ignore_tags: 'x,a', //i termini inseriti tra <x></x> non vengono tradotti
      non_splitting_tags: 'e, t, n',
      // All optional parameters available in the official documentation can be defined here as well.
    })
      .then((result) => {
        pushTranslation(el[0], result.data.translations[0].text, index, len);
        if (el[index + 1] != undefined) translateSentence(el, index + 1);
      })
      .catch((error) => {
        console.error(error);
      });
  } else translateSentence(el, index + 1);
}

let translationObject = [{}];
function pushTranslation(objInfo, text, index, len) {
  if (!translationObject[0].hasOwnProperty('id')) {
    translationObject[0] = objInfo;
  }
  translationObject[index] = { text: text };
  //console.log('index: ' + index + ', len: ' + len);
  if (index == len - 1) {
    buildRequest(translationObject);
    translationObject = [{}];
    nextFile(start_index += 1);
  }
}

function extractSentences(intentName) {
  //intentFile è un JSON
  //prendo il file json e lo leggo
  console.log('Extracting phrases from: ' + intentName);
  const rawdata = fs.readFileSync(`${intentName}_usersays_it.json`);
  const intentID = getIntentInfo(intentName, 'id');
  const realName = getIntentInfo(intentName, 'realName');
  //parso in JSON e lo mantengo nella variabile 'jsondata'
  const jsondata = JSON.parse(rawdata);
  let allSentences = [{ id: intentID, name: intentName, realName: realName }];
  jsondata.forEach((element) => {
    //element.data[0] è una frase di allenamento
    let final_string = ''; //contiene la stringa da tradurre
    element['data'].forEach((element) => {
      if (element.hasOwnProperty('meta')) {
        let eText = element.text;
        let entityType = element.meta; //nome entità @room
        let alias = element.alias; //alias entità 'parent'
        final_string += `<e><t>${eText}</t><x>${entityType}</x><a>${alias}</a></e>`;
      } else {
        final_string += `${element.text}`;
      }
    });
    allSentences.push({ text: final_string });
  });
  return allSentences;
}

function getIntentInfo(intentName, info) {
  const rawintentdata = fs.readFileSync(`${intentName}.json`);
  if (info == 'id') {
    return JSON.parse(rawintentdata).id;
  }
  if (info == 'realName') {
    let value;
    JSON.parse(rawintentdata).responses[0].parameters.forEach((el) => {
      if (el.name == 'realName') {
        value = el.value;
      }
    });
    return value;
  }
}

function buildRequest(trainingPhrasesX) {
  //costruisce il JSON da mandare a Dialogflow per fare l'upload delle frasi di allenamento
  let params = [];
  let request = {};
  request.languageCode = 'en';
  request.intentBatchInline = {};
  request.intentBatchInline.intents = [{ trainingPhrases: [] }];
  request.intentBatchInline.intents[0].displayName = trainingPhrasesX[0].name.split(
    '/'
  )[1];
  request.intentBatchInline.intents[0].name = `projects/newagent-gcg9/agent/intents/${trainingPhrasesX[0].id}`;
  trainingPhrasesX.forEach((element) => {
    if (!element.hasOwnProperty('id')) {
      let part = [];
      let fullinfo = element['text'].split(/<e>(.*?)<\/e>/g);
      fullinfo.forEach((el) => {
        let entityPart = {};
        let normalPart = {};
        if (el[0] == '<') {
          entityPart.text = el.split(/<t>(.*?)<\/t>/)[1];
          entityPart.alias = el.split(/<a>(.*?)<\/a>/)[1];
          entityPart.entityType = el.split(/<x>(.*?)<\/x>/)[1];
          part.push(entityPart);
          let check = params.find((c) => c.displayName === entityPart.alias); //controllo se ho gia inserito l'entità nella lista di entità
          if (check === undefined) {
            params.push({
              displayName: entityPart.alias,
              entityTypeDisplayName: entityPart.entityType,
              isList: false,
              value: `$${entityPart.alias}`,
            });
          }
        } else if (el !== '') {
          normalPart.text = el;
          part.push(normalPart);
        }
      });
      request.intentBatchInline.intents[0].trainingPhrases.push({
        parts: part,
      });
    }
  });
  params.push({
    displayName: 'realName',
    entityTypeDisplayName: '@sys.any',
    isList: false,
    value: trainingPhrasesX[0].realName,
  }); //aggiungo il realName ai parametri
  request.intentBatchInline.intents[0].parameters = params;
  fs.writeFileSync(
    `./translation/${trainingPhrasesX[0].name.split('/')[1]}.json`,
    JSON.stringify(request)
  );
  console.log(
    'Writing the file ' + trainingPhrasesX[0].name.split('/')[1] + '.json '
  );
}


const fileList = findFile();

function nextFile(index) {
  if (fileList[index] != undefined) {
    console.log('Executing file n. ' + index + ' / ' + fileList.length);
    let s = extractSentences(fileList[index]);
    translateSentence(s, 0);
  }
}
nextFile(start_index);


function findFile() {
  fs.readdirSync(dir).forEach((name) => {
    if (!name.includes('usersays')) {
      filesFound.push(`data/${name.split('.')[0]}`);
    }
  });
  console.log(`Found ${filesFound.length} file.`);
  return filesFound;
}
