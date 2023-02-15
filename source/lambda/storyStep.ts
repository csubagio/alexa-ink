
import * as ASKCore from 'ask-sdk-core'

import {StoryBuildItems} from "./storyBuilding"
import {buildWebAPIStoryStep} from "./webAPI"
import {buildAPLStoryStep} from "./apl"
import {buildOptionsDynamicEntity} from "./entities"
import * as StoryData from "./storyData"
import * as WebAPI from "./webAPI"

export function buildStoryStep( hi: ASKCore.HandlerInput, step: StoryData.Step ): StoryBuildItems {
  let result: StoryBuildItems = { directives:[] };
  
  if ( WebAPI.hasWebAPI(hi) ) {
    result = buildWebAPIStoryStep(hi, step);
  } else {
    result = buildAPLStoryStep(hi, step);
  }
  
  result.entities = buildOptionsDynamicEntity(hi, step);
  if ( result.entities ) {
    result.directives.push( result.entities );
  }
  
  return result;
}
