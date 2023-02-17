import * as ASKCore from 'ask-sdk-core'
import {LinePart} from '../web/alexaTypes';
import {resolveAssetURL, getS3PreSignedUrl} from './s3Asset';
import {cleanAndWrapSSML, cleanAndWrapSSMLAPLA} from './ssml';
import {StoryBuildItems} from './storyBuilding';
import {colophon, Step} from './storyData';

export function hasAPL(hi: ASKCore.HandlerInput): boolean {
  return ASKCore.getSupportedInterfaces(hi.requestEnvelope)['Alexa.Presentation.APL'] !== undefined;
}



export function buildAPLStoryStep( hi: ASKCore.HandlerInput, step: Step ): StoryBuildItems {

  const result: StoryBuildItems = { directives: [] }
  
  const rootSequence: any[] = [];
  let currentSequence: any[] = rootSequence;
    
  result.apla = {
    type: "Alexa.Presentation.APLA.RenderDocument",
    token: "no-token",
    document: {
      version: "0.91",
      type: "APLA",
      mainTemplate: {
        item: {
          type: "Sequencer",
          items: rootSequence,
        }
      }
    },
    datasources: {}
  }
  
  result.directives.push( result.apla );

  let clusters: any[][] = [];
  let cluster: any[] = [];
  let newCluster = () => {
    cluster = [];
    clusters.push( cluster );
  }
  newCluster();

  let pushSafeAudio = (url: string, fork: number | undefined): void => {
    // APLA will fail if the URL is invalid and the skill will crash
    // so in a pinch we'll just ignore bad data and hope the story 
    // still makes sense.
    let resolved = resolveAssetURL(url);
    if ( resolved ) {
      cluster.push({
        "type": "Audio",
        "source": resolved,
        fork
      });
    } else {
      cluster.push({
        type: "Speech",
        content: "Missing audio file.",
        fork
      })
    }
  }
  
  let processParts = (parts: LinePart[]) => {
    for ( let part of parts ) {
      if ( ("txt" in part) && !("vod" in part) ) {
        cluster.push({
          type: "Speech",
          contentType: "SSML",
          content: cleanAndWrapSSMLAPLA(part.txt)
        })
      }

      if ( "vo" in part ) {
        pushSafeAudio( part.vo, undefined );
      }
      
      if ( "sfx" in part ) {
        if ( part.delay && part.delay >= 0 ) {
          pushSafeAudio( part.sfx, part.delay );
        } else {
          pushSafeAudio( part.sfx, undefined );
        };
      }
      
      if ( "end" in part && colophon.ending ) {
        newCluster();
        cluster.push({
          type: "Speech",
          contentType: "SSML",
          content: cleanAndWrapSSMLAPLA(colophon.ending)
        })
      }
      
      if ( "eol" in part ) {
        newCluster();
      }
    }
  }
  processParts( step.parts );

  newCluster();

  const options = step.options;
  if ( options.length === 0 ) {
    // NOP
  } else {
    // TODO: is 1 option a Yes/No question?
    cluster.push({
      type: "Speech",
      content: `Should I`
    })
    for ( let optionIndex=0; optionIndex<options.length; ++optionIndex ) {
      if ( optionIndex === options.length-1 ) {
        cluster.push({
          type: "Speech",
          content: `or ${optionIndex + 1}`
        })
      } else {
        cluster.push({
          type: "Speech",
          content: `${optionIndex + 1}`
        })
      }
      cluster.push({
        "type": "Silence",
        "duration": 350
      })
      processParts( options[optionIndex].parts );
    }
  }
  console.log( step, clusters );
  clusters = clusters.filter( c => c.length > 0 );
  for ( let clusterIndex=0; clusterIndex<clusters.length; ++clusterIndex ) {
    const cluster = clusters[clusterIndex];
    if ( clusterIndex > 0 ) {
      currentSequence.push({
        "type": "Silence",
        "duration": 500 + Math.floor(Math.random() * 500)
      });
    }
    cluster.forEach( item => {
      if ( typeof( item.fork ) === 'number' ) {
        let newSequence: any[] = [];
        currentSequence.push({
          type: "Mixer",
          items: [
            item,
            {
              type: "Sequencer",
              items: newSequence
            }
          ]
        })
        if ( item.fork > 0 ) {
          newSequence.push({
            "type": "Silence",
            "duration": item.fork * 1000
          })
          delete( item.fork );
        }
        currentSequence = newSequence;
      } else {
        currentSequence.push(item); 
      }
    });
  }

  return result;
}