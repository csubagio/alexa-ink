import * as ASKModel from "ask-sdk-model"
import * as ASKCore from 'ask-sdk-core'
import {parseAlexaRequest} from "./interactionModel"
import * as StoryData from "./storyData"
import * as WebAPI from "./webAPI"
import {buildStoryStep} from "./storyStep"
import {SkillPersistentData} from "./persistentData"
import {entityTextFromParts} from "./entities"



export class IntentProcessor implements ASKCore.RequestHandler {
  canHandle(hi: ASKCore.HandlerInput): boolean|Promise<boolean> {
    return ASKCore.getRequestType(hi.requestEnvelope) === 'IntentRequest';
  }
  async handle(hi: ASKCore.HandlerInput): Promise<ASKModel.Response> {
    const parsed = parseAlexaRequest(ASKCore.getRequest(hi.requestEnvelope));
    const attributesManager = hi.attributesManager;

    let persistentData: SkillPersistentData;
    
    let getPersistentData = async () => {
      if ( persistentData ) {
        return persistentData;
      }
      persistentData = await attributesManager.getPersistentAttributes();
      return persistentData;
    }
    
    let selectedOption: number|undefined;
    
    console.log(JSON.stringify(parsed,null,2));
    
    switch ( parsed.name ) {
      case "SelectOption": 
      case "OptionOnly": {
        if ( parsed.slots.option ) {
          let val: number | null = null;
          if ( parsed.slots.option.id ) {
            val = parseInt(parsed.slots.option.id);
          }

          if ( val !== null && !isNaN(val) ) {
            // see if we got our exact ID back
            selectedOption = val;
          
          } else if ( parsed.slots.option.raw ) {
            // if not fall back to see if we can match the value
            // saw this happen in case disagreement
            
            let pd = await getPersistentData();
            console.log(`checking persistent data ${JSON.stringify(pd,null,2)}`)
            if ( pd.story?.lastStep?.options ) {
              let options = pd.story?.lastStep?.options;
              for ( let i=0; i<options.length; ++i  ) {
                let expected = entityTextFromParts(options[i].parts);
                if ( expected.toLocaleLowerCase() === parsed.slots.option.raw ) {
                  selectedOption = i;
                  break;
                }
              }
            }
          }
        }
        break;
      }
      
    }
    
    const builder = hi.responseBuilder;
    
    if ( selectedOption !== undefined ) {
      let pd = await getPersistentData();
      
      if ( !pd ) {
        // todo retry? recover?
        throw(new Error('missing persistent data altogether'));
      }
      
      if ( !pd.story ) {
        // todo retry? recover?
        throw(new Error('missing story in persistent data'));
      }
      
      StoryData.step( pd.story, selectedOption );

      if ( pd.story.lastStep ) {
        const items = buildStoryStep(hi, pd.story.lastStep);

        if ( items.speech ) {
          builder.speak(items.speech);
        }
        
        if ( items.html ) {
          items.html.message.fromVoiceIntent = true;
        }
        
        for ( let d of items.directives ) {
          builder.addDirective(d);
        }
        
        if ( WebAPI.hasWebAPI(hi) ) {
          builder.withShouldEndSession(undefined as any); 
        } else {
          builder.withShouldEndSession(false);
        }
        
      } else {
        // WTF?
        throw(new Error('bad data'));
      }
      
      attributesManager.setPersistentAttributes(pd);
      await attributesManager.savePersistentAttributes();
  
    } else {
      const options = [
        "Didn't catch that.",
        "Come again?",
        "Could you repeat that?",
        "Once more please"
      ];
      
      builder.speak(options[ Math.floor(Math.random() * options.length) ]);
      builder.withShouldEndSession(false);
    }
    
    return builder.getResponse();
  }
   
}
