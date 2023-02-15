import {MessageFromSkill, MessageToSkill} from "./alexaTypes";
import {pushDebug} from "./debug"
import {setOptions} from "./options"
import {fadeOutOverlay} from "./overlay"
import {animate, pushStoryParts} from "./storyWriter"
import {setTitle} from "./header";
import {refreshHelpText} from "./footer";
import {updateColophone} from "./colophone";
import {cacheTTS, flushCache} from "./sounds";


export function onMessageReceived(msg: MessageFromSkill) {
  pushDebug(JSON.stringify(msg,null,2));
  
  if ( msg.colophon ) {
    updateColophone(msg.colophon);
    setTitle(msg.colophon.title, msg.colophon.author);
  }
  
  if ( msg.tts ) {
    flushCache();
    for ( let key in msg.tts ) {
      cacheTTS( key, msg.tts[key] );
    }
  }
  
  if ( msg.appendPresentation ) {
    pushStoryParts( msg.appendPresentation );
  }
  
  if ( msg.setOptions ) {
    setOptions( msg.setOptions );
  }
  
  if ( msg.multipart ) {
    postSkillMessage({nextMultipart: true});
  }
  
  if ( msg.fromVoiceIntent ) {
    playerIsUsingVoice = true;
  }
}

let playerIsUsingVoice = true;
export function isPlayerUsingVoice() {
  return playerIsUsingVoice;
}
export function setPlayerIsUsingTouch() {
  playerIsUsingVoice = false;
}


export function postSkillMessage(msg: MessageToSkill) {
  pushDebug(`posting: ${JSON.stringify(msg,null,2)}`);
  if ( alexaClient ) {
    alexaClient.skill.sendMessage(msg);
  } 
}
 
let persistentData = {};
let alexaClient: Alexa.AlexaClient | undefined;
export let supportsWakeWord = true;
export let supportsPushToTalk = false;
export let wakeWord = 'Alexa';

export function beginAlexa() {
  Alexa.create({ version: "1.1" })
  .then((args) => {
    if ('alexa' in args) {
      let alexa = args.alexa;
      alexaClient = alexa;
      pushDebug( `Alexa is ready :) Received initial data: ${JSON.stringify(args.message)}` );
      
      // hook up the message receiver
      alexa.skill.onMessage((msg: any) => onMessageReceived(msg as MessageFromSkill));
      
      // store this on this entity for convenient access 
      if ( alexa.capabilities && alexa.capabilities.microphone ) {
        supportsWakeWord = alexa.capabilities.microphone.supportsWakeWord;
        supportsPushToTalk = alexa.capabilities.microphone.supportsPushToTalk;
      }
      
      // listen to the mic opening so that we know when the 
      // player wants to use voice 
      alexa.voice.onMicrophoneOpened( () => {
        playerIsUsingVoice = true;
      });
      
      // process the startup data we sent ourselves
      let connectionMessage = {};
      if (args.message) {
        persistentData = args.message.persistentData || {};
        try {
          // this is the mechanism for discovering which wakeword is active
          // by sending ourselves a string that we process with the hint transformer
          if (args.message.hint) {
            const match = /try\s+\"(\w*),/gi.exec( args.message.hint );
            if (match) {
              pushDebug( `discovered wake word: ${match[1]}` );
              wakeWord = match[1];
            }
          }
        } catch (err) {
          console.error(err);
          wakeWord = "Alexa";
        }
        connectionMessage = args.message;
        onMessageReceived(args.message);
      } else {
        console.error("potential problem with the endpoint: we connected to Alexa successfully, but did NOT receive any start up data from the skill.");
        connectionMessage = {persistentData};
      }

      pushDebug( `Alexa init complete` );

      refreshHelpText();
      setTimeout( fadeOutOverlay, 10 );
      setTimeout( animate, 500 );
    } else {
      // something went wrong with initialization, Alexa services won't be available
      pushDebug( `Alexa did not return a client object, code: ${args.code}` );
    }
  })
  .catch((err) => {
    // something went wrong during initialization, the service may be down?
    pushDebug( `Alexa failed to create :( reason: ${JSON.stringify(err,null,2)}` );
  });
}

export function openMic() {
  if ( !playerIsUsingVoice ) {
    return;
  }
  
  if ( !supportsWakeWord ) {
    return;
  }
  
  pushDebug('opening the mic');
  if (!alexaClient) {
    return;
  }
  
  alexaClient.voice.requestMicrophoneOpen({
    onOpened: undefined,
    onClosed: undefined,
    onError: (err) => {
      postSkillMessage( { prompt: true } );
    }
  });
}
