import * as ASKModel from "ask-sdk-model"
import * as ASKCore from 'ask-sdk-core'
import {StoryBuildItems} from './storyBuilding';
import {Step} from './storyData';
import {LinePart} from "../web/alexaTypes";


export function entityTextFromParts( parts: LinePart[] ): string {
  const acc: string[] = [];
  parts.forEach( p => {
    if ( "txt" in p ) {
      acc.push(p.txt) 
    }
  });
  return acc.join(' ').trim();
}

export function buildOptionsDynamicEntity( hi: ASKCore.HandlerInput, step: Step ): ASKModel.dialog.DynamicEntitiesDirective | undefined {

  if ( !step.options || step.options.length === 0 ) {
    return undefined;
  }
  
  let slotValues: ASKModel.er.dynamic.Entity[] = [];
  let slotsDir: ASKModel.dialog.DynamicEntitiesDirective = {
    type: "Dialog.UpdateDynamicEntities",
    updateBehavior: "REPLACE",
    types: [
      {
        name: "Option",
        values: slotValues 
      }
    ]
  } 
  
  for ( let optionIndex=0; optionIndex<step.options.length; ++optionIndex ) {
    const option = step.options[optionIndex];
    let cleanText = entityTextFromParts(option.parts);
    cleanText = cleanText.replace(/[^a-zA-Z0-9\']/g, ' ').trim();
    //cleanText = cleanText.toLocaleLowerCase();
    slotValues.push({
      id: '' + optionIndex,
      name: {
        value: cleanText,
      }
    })      
  }

  return slotsDir;
}