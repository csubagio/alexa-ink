import * as ASKCore from 'ask-sdk-core'
import {LinePart} from '../web/alexaTypes';
import {StoryBuildItems} from './storyBuilding';
import {Step} from './storyData';

export function hasAPL(hi: ASKCore.HandlerInput): boolean {
  return ASKCore.getSupportedInterfaces(hi.requestEnvelope)['Alexa.Presentation.APL'] !== undefined;
}

function textFromParts( parts: LinePart[] ): string {
  const acc: string[] = [];
  parts.forEach( p => {
    if ( "txt" in p ) {
      acc.push(p.txt) 
    }
  });
  return acc.join(' ').trim();
}

export function buildAPLStoryStep( hi: ASKCore.HandlerInput, step: Step ): StoryBuildItems {

  const result: StoryBuildItems = { directives: [] }
  
  const mainSequenceItems: any[] = [];
    
  result.apla = {
    type: "Alexa.Presentation.APLA.RenderDocument",
    token: "no-token",
    document: {
      version: "0.91",
      type: "APLA",
      mainTemplate: {
        item: {
          type: "Sequencer",
          items: mainSequenceItems,
        }
      }
    },
    datasources: {}
  }
  
  result.directives.push( result.apla );

  let storyText = textFromParts( step.lines );
  if ( storyText ) {
    mainSequenceItems.push({
      type: "Speech",
      content: storyText
    })
  }
  
  mainSequenceItems.push({
    "type": "Silence",
    "duration": 500
  })

  const options = step.options;
  if ( options.length === 0 ) {
    // TODO: is this a Yes/No question?
    mainSequenceItems.push({
      type: "Speech",
      content: `Should I ${options[0]}?`
    })
  } else {
    let first: string[] = options.slice(0, options.length-1).map( o => textFromParts(o.parts) );
    let last: string = textFromParts(options[options.length-1].parts);
    if ( Math.random() > 0.5 ) {
      mainSequenceItems.push({
        type: "Speech",
        content: `Should I: ${first.join(', ')}, or ${last}?`
      });
    } else {
      mainSequenceItems.push({
        type: "Speech",
        content: `Should I: ${first.join(', ')}, or ${last}.`
      });
    }
  }

  return result;
}