import assert from "assert"
import {IntentRequest} from "ask-sdk-model"
import * as StoryData from "./storyData";
import {buildWebAPIStoryStep} from "./webAPI";
import {HandlerInput} from "ask-sdk-core";

function createOptionRequest(opt: string) : IntentRequest {
  const req: IntentRequest = {
    type: "IntentRequest",
    requestId: "some-request-id",
    timestamp: (new Date).toUTCString(),
    dialogState: "COMPLETED",
    intent: {
      name: "SelectOptionIntent",
      slots: {
        option: {
          name: "option", 
          confirmationStatus: "CONFIRMED",
          value: opt
        }
      },
      confirmationStatus: "NONE"
    }
  }
  
  return req;
}

describe('running a story', () => {
  it('should produce the colophon', () => {
    assert.equal( StoryData.colophon.title, "The Mystery of Thorium Manor" );
    assert.equal( StoryData.colophon.author, "Chris Subagio" );
    assert.equal( StoryData.colophon.style, "minimal" );
    assert.equal( StoryData.colophon.ending, "The End... ?" );
  })

  it('should initialize a story', () => {
    const persistentData = StoryData.begin();
    
    const step = persistentData.lastStep;    
    assert.ok( persistentData );
    assert.ok( step );
    assert.equal( step.options.length, 2 );
    
    assert.deepEqual( step.parts, [ 
      { img: "host:titleCard.jpg", eol: true },
      { sfx: "http://somesite.com/intro.ogg", delay: 5 },
      { txt: "Welcome to the" },
      { sfx: "host:effects/magic.mp3", delay: -3 },
      { txt: "story." },
      { sfx: "some:tada.ogg", eol: true },
      { sfx: "whoosh.mp3", eol: true },
      { txt: "You're standing in an impressive marble vestibule, clearly belonging to a wealthy manor. You cannot quite recall how you came to be here, but you're overcome with the need to leave.", vod: true },
      { vo: "0.mp3", eol: true },
    ]);
    
    assert.deepEqual( step.options[0].parts, [
      { txt: "option 1", eol: true }
    ]);

    assert.deepEqual( step.options[1].parts, [
      { txt: "option 2", vod: true },
      { vo: "11.mp3", eol: true },
    ]);
    
    let web = buildWebAPIStoryStep({} as HandlerInput, step);
  })
  
  it ('should resume story from persistent data', () => {
    const persistentData = StoryData.begin();
    StoryData.step( persistentData, 0 );   
    //console.log( `state is ${Math.ceil( (persistentData.state?.length || 0) / 1024 )} kbytes` );
    
    const step = persistentData.lastStep;    
    assert.ok( persistentData );
    assert.ok( step );
    assert.equal( step.options.length, 0 );
    
    const lines = step.parts as any[];
    assert.deepEqual( step.parts, [
      { mus: "ballroom.mp3", eol: true },
      { txt: "You enter a glistening ballroom crowned with a majestic chandelier. You thought the vestibule was grand, but this takes your breath away.", vod: true },
      { vo: "13.mp3", eol: true },
      { txt: "They lived happily ever after.", eol: true }
    ]);
  })
})