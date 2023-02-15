
import * as ASKModel from "ask-sdk-model"
import * as ASKCore from 'ask-sdk-core'
import {SkillPersistentData} from "./persistentData";
import {StoryBuildItems} from "./storyBuilding";
import * as StoryData from "./storyData"
import * as WebAPI from "./webAPI"
import {buildStoryStep} from "./storyStep";


export class LaunchProcessor implements ASKCore.RequestHandler {
  canHandle(hi: ASKCore.HandlerInput): boolean|Promise<boolean> {
    return ASKCore.getRequestType(hi.requestEnvelope) === 'LaunchRequest' ||
          ASKCore.getRequestType(hi.requestEnvelope) === 'Connections.Response';
  }
  async handle(hi: ASKCore.HandlerInput): Promise<ASKModel.Response> {
    const fetches = [];
    
    /** fetch this player's save game from the database */
    const attributesManager = hi.attributesManager;
    let persistentData: SkillPersistentData = {};
    let needsSave = false;
    fetches.push(attributesManager.getPersistentAttributes()
    .then( (data) => {
        persistentData = data || {};
    }));
    
    /** fetch this player's purchases from the store */
    const locale = hi.requestEnvelope.request.locale as string;        
    let inSkillProducts = undefined;
    if ( hi.serviceClientFactory ) {
    const msc = hi.serviceClientFactory.getMonetizationServiceClient();
    fetches.push( msc.getInSkillProducts(locale)
    .then( (result) => {
        inSkillProducts = result.inSkillProducts || [];
    }).catch( (err) => {
        console.error(err);
        console.error(`failed to fetch in skill purchases. We will not prevent launch, but entitlements will be missing.`);
    }));
    }
  
    /** this may be a connection result, which means we're coming back from the store */
    let purchaseResult = undefined;
    if ( ASKCore.getRequestType(hi.requestEnvelope) === 'Connections.Response' && 'payload' in hi.requestEnvelope.request && hi.requestEnvelope.request.payload ) {
        // fish out the result
        purchaseResult = hi.requestEnvelope.request.payload.purchaseResult;
    }
    
    await Promise.all( fetches ); 
    
    //if ( !persistentData.story ) {
      persistentData.story = StoryData.begin();
      needsSave = true;
    //}
    
    const builder = hi.responseBuilder;
    let storyItems: StoryBuildItems = { directives:[] };
    
    if ( persistentData.story.lastStep ) {
      storyItems = buildStoryStep( hi, persistentData.story.lastStep );
    }
    
    if ( WebAPI.hasWebAPI(hi) ) {
      // Have Web API! 
      builder.addDirective( WebAPI.buildHTMLStartDirective( persistentData.story, storyItems ) );
      builder.withShouldEndSession(undefined as any);

    } else {
      // No Web API
      if ( storyItems.apla ) { builder.addDirective(storyItems.apla); }
      if ( storyItems.apl ) {  builder.addDirective(storyItems.apl); }

      builder.withShouldEndSession(false);
    }
    
    if ( storyItems.entities ) {
      builder.addDirective(storyItems.entities);
    }
    if ( storyItems.speech ) {
      builder.speak( storyItems.speech );
    }
    
    if ( needsSave ) {
      attributesManager.setPersistentAttributes(persistentData);
      await attributesManager.savePersistentAttributes();
    }
    
    return builder.getResponse();
  }  
}
