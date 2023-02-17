import {onMessageReceived} from "./alexa";
import {setOptions} from "./options";
import {pushStoryParts} from "./storyWriter";

const debugDivEnabled = false;


const elements = {
  debug: document.getElementById("debug") as HTMLDivElement,
}

// prevents focus stealing on FTV
elements.debug.addEventListener('focus', () => {
  elements.debug.blur();
})

const debugLines: string[] = [];
let debugTimeout = setTimeout(()=>{}, 1);
export function pushDebug(msg: string) {
  if (!debugDivEnabled) return;
  elements.debug.style.display = 'block';
  elements.debug.style.opacity = '1';
  debugLines.push(msg);
  if ( debugLines.length > 10 ) { 
    debugLines.shift(); 
  }
  elements.debug.innerText = debugLines.join('\n===\n');
  elements.debug.scrollTo(0, elements.debug.scrollHeight);
  clearTimeout(debugTimeout);
  debugTimeout = setTimeout(() => elements.debug.style.opacity = '0.3', 5000);
}

elements.debug.addEventListener('click', () => {
  elements.debug.style.opacity = '1';
  clearTimeout(debugTimeout);
  debugTimeout = setTimeout(() => elements.debug.style.opacity = '0.3', 5000);
})


function spoofOptions(labels: string[]) {
  setOptions( labels.map( l => { return { parts: [{txt: l}], isDebug: true } } ) );
}

function spoofMessage(story: string[], options: string []) {
  onMessageReceived({
    appendPresentation: story.map( s => { return { txt:s, eol: true } } ),
    setOptions: options.map( o => { return { parts: [{txt: o}], isDebug: true } } )
  })
}

function createRandomOptions() {
  let optionsCount = Math.random() > 0.7 ? 4 : 3;
  
  let options = shuffle( ["Think", "Plan", "Wait", "Then What?", "Ok", "And then we did the thing", "So what?", "Something to consider", "A longer option", "What happens if I say this?", "But also", "Or maybe"] ).slice( 0, optionsCount );
  
  return options.slice(0, optionsCount);
}


export function debugSpoofResponse() { 
  const story: string[] = [];
  let options: string[] = [];
  
  story.push("They are keeping me waiting.");
  if ( Math.random() > 0.5 ) {
    story.push("The door was locked after I sat down."); 
  }
  if ( Math.random() > 0.6 ) {
    story.push("They suspect me to be a traitor. They think I stole the component from the calculating machine. They will be searching my bunk and cases.");
  }
  if ( Math.random() > 0.9 ) {
    story.push("When they don't find it, they'll come back and demand I talk."); 
  }

  spoofMessage( story, createRandomOptions() );
}

function spoofRandomOptions() {
  let options = createRandomOptions();
  setOptions(options.map( o => { return { parts: [{txt: o}], isDebug: true } } ));
}


function shuffle<T>(arr: T[]): T[] {
  for ( let i=0; i<arr.length; ++i ) {
    let j = Math.floor( Math.random() * arr.length );
    let v = arr[i];
    arr[i] = arr[j];
    arr[j] = v;
  }
  return arr;
}

export function setupLocalTesting() {
  window.addEventListener("keydown", (ev) => {
    switch ( ev.key ) {
      case '1': {
        pushStoryParts([
          { txt: "They are keeping me waiting.", eol: true },
          { txt: "The door was locked after I sat down.", eol: true } 
        ]);         
        spoofOptions(["Think", "Plan", "Wait"]);
        break;
      }
      case '2': {
        debugSpoofResponse();
        break;
      }
      case '3': {
        onMessageReceived({
          colophon: {
            title: "The Intercept",
            author: "Inkle Studios",
            introduction: "",
            resumption: "",
            ending: "Story Over.",
            style: "typewriter",
          }
        })
        break;
      }
      case '4': {
        setOptions([]);
        pushStoryParts([
          {txt: "They suspect me to be a traitor. They think I stole the component from the calculating machine. They will be searching my bunk and cases."},
          {end: true }
        ]);
        break;
      }
      case '5': { 
        spoofRandomOptions();
        pushStoryParts([
          { img: "bletchley.jpg", eol: true },
          { txt: "They are keeping me waiting.", eol: true },
        ]);
        break;
      }
      case '6': {
        spoofRandomOptions();
        pushStoryParts([
          {txt: "They suspect me to be a traitor. They think I stole the component from the calculating machine. They will be searching my bunk and cases."},
          {img: "the_bombe.jpg"}
        ]);
        break;
      }
      case '7': {
        spoofRandomOptions();
        pushStoryParts([
          {img: "the_bombe.jpg"},
          {txt: "They suspect me to be a traitor.", eol: true},
          {txt: "They think I stole the component from the calculating machine. They will be searching my bunk and cases."},
        ]);
        break;
      }
      case '8': {
        spoofRandomOptions();
        pushStoryParts([
          {txt: "They suspect me to be a traitor."},
          {img: "the_bombe.jpg"},
          {txt: "They think I stole the component from the calculating machine. They will be searching my bunk and cases.", eol: true},
        ]);
        break;
      }
      
      case 'q': {
        spoofOptions([
          "First option", 
          "Second option", 
          "Third option"
        ]);
        pushStoryParts([ {txt: "Woah."} ]);
        break;
      }
      case 'w': {
        spoofRandomOptions();
        pushStoryParts([ {txt: "Woah."} ]);
        break;
      }
      case 'e': {
        spoofOptions([
          "Just a really long options, like seriously, are you trying to write a novel in here?", 
          "Also a super long one, like, there must be a better way to let the player know about this.", 
          "OK, fine, at this point it's probably a little too unwieldly for voice. By the time you get here, you'll forget the first choice."
        ]);
        pushStoryParts([ {txt: "Woah."} ]);
        break;
      }
      case 'r': {
        spoofOptions([
          "Just a really long options, like seriously, are you trying to write a novel in here?", 
          "Yup.", 
          "OK, fine, at this point it's probably a little too unwieldly for voice. By the time you get here, you'll forget the first choice."
        ]);
        pushStoryParts([ {txt: "Woah."} ]);
        break;
      }
      
      
      
      case 'z': {
        onMessageReceived({
          colophon: {
            title: "The Intercept",
            author: "Inkle Studios",
            introduction: "",
            resumption: "",
            ending: "Story Over.",
            style: "typewriter",
          },
          appendPresentation: [
            { img: "bletchley.jpg", eol: true },
            { txt: "They are keeping me waiting.", eol: true },
            { txt: "The door was locked after I sat down.", eol: true } 
          ]
        })
        spoofOptions(["Think", "Plan", "Wait"]);
        break;
      }
    }
  });
  
  window.addEventListener('mousedown', () => {
    //debugSpoofResponse();    
  })
}

