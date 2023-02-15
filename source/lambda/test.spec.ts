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
    assert.equal( StoryData.colophon.style, "fantasy" );
    assert.equal( StoryData.colophon.theEnd, "The End... ?" );
  })

  it('should initialize a story', () => {
    const persistentData = StoryData.begin();
    
    const step = persistentData.lastStep;    
    assert.ok( persistentData );
    assert.ok( step );
    assert.equal( step.options.length, 2 );
    
    assert.deepEqual( step.lines, [ 
      { img: "titleCard.jpg", eol: true },
      { sfx: "intro.ogg", delay: 5 },
      { txt: "Welcome to the" },
      { sfx: "magic.mp3", delay: -3 },
      { txt: "story.", eol: true },
      { sfx: "whoosh.mp3", eol: true },
      { txt: "You're standing in an impressive marble vestibule, clearly belonging to a wealthy manor. You cannot quite recall how you came to be here, but you're overcome with the need to leave." },
      { vo: "0.mp3", eol: true },
    ]);
    
    assert.deepEqual( step.options[0].parts, [
      { txt: "You hear the sounds of some sort of party wafting up the stairwell" },
      { vo: "9.mp3", eol: true },
    ]);

    assert.deepEqual( step.options[1].parts, [
      { txt: "You smell sweet perfume descending from the landing above" },
      { vo: "11.mp3", eol: true },
    ]);
    
    let web = buildWebAPIStoryStep({} as HandlerInput, step);
    //console.log((web.directives[0] as any).message.appendPresentation);
  })
  
  it ('should resume story from persistent data', () => {
    const persistentData = StoryData.begin();
    StoryData.step( persistentData, 0 );   
    console.log( `state is ${Math.ceil( (persistentData.state?.length || 0) / 1024 )} kbytes` );
    //console.log( persistentData.lastStep );    
    
    const step = persistentData.lastStep;    
    assert.ok( persistentData );
    assert.ok( step );
    assert.equal( step.options.length, 0 );
    
    const lines = step.lines as any[];
    assert.deepEqual( step.lines, [
      { mus: "ballroom.mp3", eol: true },
      { txt: "You enter a glistening ballroom crowned with a majestic chandelier. You thought the vestibule was grand, but this takes your breath away." },
      { vo: "13.mp3", eol: true },
      { txt: "They lived happily ever after.", eol: true }
    ]);
  })
})