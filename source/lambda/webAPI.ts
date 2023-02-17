import * as ASKModel from "ask-sdk-model"
import * as ASKCore from 'ask-sdk-core'
import {LinePart, MessageFromSkill, MessageToSkill, TTSText} from '../web/alexaTypes'
import {StoryBuildItems} from './storyBuilding'
import * as StoryData from './storyData'
import {OptionDefinition} from "../web/options"
import {buildOptionsDynamicEntity} from "./entities"
import {SkillPersistentData} from "./persistentData"
import {resolveAssetURL, getS3PreSignedUrl} from "./s3Asset"
import {cleanAndWrapSSML} from "./ssml"


export class HTMLMessageProcessor implements ASKCore.RequestHandler {
  canHandle(hi: ASKCore.HandlerInput): boolean|Promise<boolean> {
    return ASKCore.getRequestType(hi.requestEnvelope) === "Alexa.Presentation.HTML.Message";
  }
  async handle(hi: ASKCore.HandlerInput): Promise<ASKModel.Response> {
    return processMessage(hi);
  }
}


export function hasWebAPI(hi: ASKCore.HandlerInput): boolean {
  return ASKCore.getSupportedInterfaces(hi.requestEnvelope)['Alexa.Presentation.HTML'] !== undefined;
}






export function buildWebAPIStoryStep( hi: ASKCore.HandlerInput, step: StoryData.Step ): StoryBuildItems {

  const result: StoryBuildItems = { directives: [] }
  const options: OptionDefinition[] = [];
  const presentation: LinePart[] = JSON.parse( JSON.stringify( step.parts ) );
  const message: MessageFromSkill = {
    appendPresentation: presentation,
    setOptions: options
  }
  const transformers: ASKModel.interfaces.alexa.presentation.html.Transformer[] = [];

  // sign any local references
  for ( let line of presentation ) {
    if ( "sfx" in line ) {
      line.sfx = resolveAssetURL(line.sfx) || line.sfx;
    }
    if ( "img" in line ) {
      line.img = resolveAssetURL(line.img) || line.img;
    }
  }
  
  result.html = {
    type: "Alexa.Presentation.HTML.HandleMessage",
    message, transformers
  }
  result.directives.push( result.html );
  
  const tts: Record<string,TTSText> = {};
  message.tts = tts; 

  let registerTTS = (key: string, text:string) => {
    cleanAndWrapSSML(text);
    tts[key] = { text, url: "" }
    transformers.push({
      inputPath: `tts.${key}.text`,
      transformer: "ssmlToSpeech",
      outputName: "url"
    });
  }

  presentation.forEach( (t,i) => {
    if ( ("txt" in t) && !("vod" in t) ) {
      const key = `t${i}`;
      t.tts = key;
      registerTTS( key, t.txt );
    };
  });
  
  for ( const o of step.options ) {
    options.push({ parts: o.parts });
  }
  
  if ( step.storyEnded ) {
    const key = `theEnd`;
    registerTTS( key, StoryData.colophon.ending );
    presentation.push({ end: true, tts: key });
  }
  
  return result;
}


function mergeMessagesFromSkil( target: MessageFromSkill, source: MessageFromSkill ) {
  for ( let k in source ) {
    (target as any)[k] = (source as any)[k];
  }
}


export function buildHTMLStartDirective( data: StoryData.Data, items: StoryBuildItems ): ASKModel.interfaces.alexa.presentation.html.StartDirective  {
  
  const message: MessageFromSkill = {
    hint: "hello",
    colophon: StoryData.colophon
  }
  const transformers: ASKModel.interfaces.alexa.presentation.html.Transformer[] = [];
  
  transformers.push({
    inputPath: `hint`,
    transformer: "textToHint"
  })

  // merge the directives
  if ( items.html ) {
    const storyMsg: MessageFromSkill = items.html.message;
    mergeMessagesFromSkil( message, storyMsg );
    if ( items.html.transformers ) {
      for ( let t of items.html.transformers ) {
        transformers.push( t );
      }
    }
  }
  
  return {
    type: "Alexa.Presentation.HTML.Start",
    data: message,
    request: {
      uri: getS3PreSignedUrl(`Media/index_${StoryData.colophon.style}.html`),
      method: "GET",
    },
    configuration: {
      timeoutInSeconds: 600
    },
    transformers: transformers
  }
}


export async function processMessage(hi: ASKCore.HandlerInput): Promise<ASKModel.Response> {
  
  const request = hi.requestEnvelope.request as ASKModel.interfaces.alexa.presentation.html.MessageRequest;
    
  const requestMessage: MessageToSkill = request.message;
      
  // collect outputs for our response
  const speech = [];
  let endSession: boolean = undefined as any;
  let sendHTMLMessage = false;
  const responseMessage: MessageFromSkill = {};
  const transformers: ASKModel.interfaces.alexa.presentation.html.Transformer[] = [];
  const sessionAttributes = hi.attributesManager.getSessionAttributes();

  if ( requestMessage.time ) {
    // debug facility to help measure latence. If we send a
    // timestamp, the skill will speak out the amount of time that has 
    // passed on the clock, by the time the message is received here
    const lag = Date.now() - requestMessage.time;
    if ( lag > 1000 ) {
      speech.push( `send ${Math.floor(lag/1000)} seconds ago,`);
    } else {
      speech.push( `sent ${lag} milliseconds ago,`);
    }
  }

  if ( requestMessage.speech !== undefined ) {
    // this lets us ask that the standard Alexa skill audio player
    // speak out some generated speech. Useful when we need to tell 
    // the player something, but we don't want to play it in the game
    // audio. For example, when the skill is about to quit, the web
    // app will be torn down, but we can still speak a parting message.
    speech.push( requestMessage.speech );
  }

  if ( requestMessage.transform !== undefined ) {
    // this is part of a scheme in the game that allow us to ask for 
    // speech to be converted from text, but returned for playback 
    // as part of the game audio. That lets us adjust the volume and
    // tightly coordinate animations in game to match the speech.
    sendHTMLMessage = true;
    responseMessage.transformed = requestMessage.transform;
    for ( let key in responseMessage.transformed ) {
      transformers.push({
        inputPath: `transformed.${key}.text`,
        transformer: "ssmlToSpeech",
        outputName: "url"
      })
    }
  }
  
  // After every Alexa response, we have to decide whether the skill 
  // is finished. Usually Alexa skills represent short tasks, but in our
  // case of being a game, our default is to return undefined as 
  // initialized above, which means don't quit, but don't open the 
  // microphone either;
  if( requestMessage.endSession === true ) {
    // If we're done with the game, we indicate that here
    endSession = true;
  } else if ( requestMessage.prompt === true ) {
    // If we do actually want to open the microphone we ask for 
    // that here. Note that if we include alexa speech above, the 
    // microphone won't open until the speech is done.
    endSession = false;
  }
  
  /*
  if ( message.persistentData ) {
    // To save player data between gaming sessions, we're writing it
    // to the persistence adapter initialized above.
    // We have to wait here because in an AWS lambda, all processing
    // will end once this handler resolves.
    const attributesManager = handlerInput.attributesManager;
    console.log(`going to save: ${JSON.stringify(message.persistentData)}`);
    attributesManager.setPersistentAttributes(message.persistentData);
    await attributesManager.savePersistentAttributes();
  }
  */
  
  const attributesManager = hi.attributesManager;
  let persistentData: SkillPersistentData = {};
 
  let storyItems: StoryBuildItems = { directives: [] };
  let needsSave = false;
  if ( requestMessage.selectOption !== undefined ) {
    persistentData = await attributesManager.getPersistentAttributes();
    
    if ( !persistentData ) {
      // todo retry? recover?
      throw(new Error('missing persistent data altogether'));
    }
    
    if ( !persistentData.story ) {
      // todo retry? recover?
      throw(new Error('missing story in persistent data'));
    }
    
    StoryData.step( persistentData.story, requestMessage.selectOption );
    needsSave = true;
    
    if ( persistentData.story.lastStep ) {
      storyItems = buildWebAPIStoryStep(hi, persistentData.story.lastStep);
      storyItems.entities = buildOptionsDynamicEntity(hi, persistentData.story.lastStep);
      
      if ( storyItems.speech ) {
        speech.push(storyItems.speech);
      }

      if ( storyItems.html ) {
        mergeMessagesFromSkil( responseMessage, storyItems.html.message );
        if ( storyItems.html.transformers ) {
          storyItems.html.transformers.forEach( t => transformers.push(t) );
        }
      }
      sendHTMLMessage = true;      
    } else {
      // WTF?
      throw(new Error('bad data'));
    }
  }
  
  // Compose the final response based on the stuff we've done above
  let builder = hi.responseBuilder;
  let skillWillQuit = endSession === true;
  
  if ( requestMessage.startPurchase ) {
    // skill connections cannot be launched directly from this request
    // so we'll bounce the customer through a verbal confirmation first
    speech.push("Would you like to open the Alexa skill store?");
    skillWillQuit = true;
    endSession = false;
    sessionAttributes.waitingForPurchaseConfirmation = true;
    sessionAttributes.purchaseProductId = requestMessage.startPurchase;
  }
  
  // it's ok to have an empty string here
  builder.speak( speech.join(' ') );

  // send the message if we put anything in it
  if ( sendHTMLMessage ) {
    if ( skillWillQuit ) {
      console.error(`Cannot send an HTML message when we're going to quit. Ignoring message ${JSON.stringify(responseMessage,null,2)}`);
    } else {
      builder.addDirective({
        type:"Alexa.Presentation.HTML.HandleMessage",
        message: responseMessage,
        transformers: transformers
      });
    }
  }
  
  if ( storyItems.entities ) {
    builder.addDirective( storyItems.entities );
  }
  
  if ( needsSave ) {
    attributesManager.setPersistentAttributes(persistentData);
    await attributesManager.savePersistentAttributes();
  }

  return builder.withShouldEndSession(endSession).getResponse();
}