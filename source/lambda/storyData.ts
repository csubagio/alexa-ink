import fs from "fs"
import path from "path"
import * as inkjs from "inkjs" 
import {Story} from "inkjs/engine/Story" 
import {Colophon} from "../web/colophone";
import {AudioPart, LinePart, VoiceOverPart} from "../web/alexaTypes";


const storyPath = process.env['story-path'] || path.join(__dirname,'story.ink');

const storySource = fs.readFileSync(storyPath,'utf8');
const story = new inkjs.Compiler(storySource).Compile();
 

const globalTags: Record<string, string> = {};
(function() {
  if ( story.globalTags ) {
    for ( const t of story.globalTags ) {
      const colon = t.indexOf(':');
      const name = t.substring(0, colon).trim();
      const value = t.substring(colon+1).trim();
      if ( !name ) {
        console.error(`tag had no name: ${t}`);
        continue;
      }
      globalTags[name] = value;
    }
  }
})()

//console.log(`global tags:\n${JSON.stringify(globalTags,null,2)}`);



function matchAssetType( filename: string, extensions: string[] ): boolean {
  for ( let ext of extensions ) {
    if ( filename.indexOf(ext) > 0 ) {
      return true;
    }
  }
  return false;
}



export const colophon: Colophon = { 
  title: globalTags['title'] || '',
  author: globalTags['author'] || '',
  introduction: globalTags['introduction'] || '',
  resumption: globalTags['resumption'] || '',
  ending: globalTags['ending'] || "The End.",
  style: (globalTags['style'] as any) || 'typewriter',
};

const validAudioExtensions = ['.mp3', '.ogg'];
const validImageExtensions = ['.png', '.jpg'];




interface Option {
  parts: LinePart[];
}

export interface Step {
  generatedTime: number;
  parts: LinePart[];
  options: Option[];
  storyEnded?: true; 
}

export interface Data {
  state?: string;
  lastStep?: Step;
  tags: Record<string, string>;
}

// finds commands, e.g. (! do something)
const cmdRegex = /\(\!\s*([^\)]*)\)/g;
// splits a line into "words", where a word is
// any quoted string
// any string that has alpha numeric plus _ or - or .
// just the operator characters: = 
const wordsRegex = /"([^"]*)"|([\w\.\_\:\/]+)|(=)/g;

interface Word {
  raw: string;
  key: string;
  value?: string;
  number?: number;
}

function splitWords(text: string): Word[] {
  const tokens: string[] = [];
  wordsRegex.lastIndex = 0;
  let match = wordsRegex.exec(text);
  for ( let i=0; i<100; ++i ) {
    if ( !match ) {
      break;
    }
    tokens.push( match[1] || match[2] || match[3] );
    match = wordsRegex.exec(text);
  }
  const result: Word[] = [];
  for ( let i=0; i<tokens.length; ++i ) {
    let t = tokens[i];
    if ( t === '=' ) {
      let v = tokens[i+1];
      i++;
      result[result.length-1].value = v;
      let num = parseFloat(v);
      if ( !isNaN(num) ) {
        result[result.length-1].number = num;
      }
    } else {
      result.push({raw: t, key: t.toLowerCase()});
    }
  }
  
  return result;
}

function parseLine(text: string, parts: LinePart[]): void {
  // step through line, extracting any commands 
  const newParts: LinePart[] = [];
  
  cmdRegex.lastIndex = 0;
  let head = 0;
  let match = cmdRegex.exec( text );
  let lineVO: VoiceOverPart | undefined;
  let haveNonTextAudio = false;
  
  for (let guard=0; guard<100; ++guard) {
    if ( !match ) break;
    
    // all text up to the command 
    if ( match.index > head ) {
      let fragment = text.substring(head, match.index).trim();
      if ( fragment.length > 0 ) {
        newParts.push({ txt: fragment });
      }
    }
    head = match.index + match[0].length;

    const cmd = match[1];
    const words = splitWords(cmd);
    if ( words[0] ) {
      //const remainder = cmd.substring( cmd.indexOf(words[0]) + words[0].length ).trim();

      // the first word of the command may determine what to do
      switch ( words[0].key ) {
        case 'vo': {
          // vo means: replace text in this line with this audio
          if ( lineVO ) {
            console.error(`ignoring more than one vo in line ${text}`);
          } else {
            lineVO = { vo: words[1].raw };
            if ( words[1] ) {
              newParts.push(lineVO);
            } else {
              console.error(`vo command has no filename? ${cmd}`);
            }
          }
          break;
        }
        case 'music': {
          // music means: replace the file in the music track with this one
          if ( matchAssetType(words[1].raw, validAudioExtensions) ) {
            newParts.push({ mus: words[1].raw });
          } else {
            console.error(`music command has no filename? ${cmd}`);
          }
          break;
        }
        case 'sync': {
          // means: the visual presentation and audio presentation wait
          // for each other to meet up at this point
          newParts.push({ sync: true });
          break;
        }
        default: { 
          // otherwise it may just be an asset reference
          let filename = words[0].raw;
          
          if ( matchAssetType(filename, validAudioExtensions) ) {
            let part: AudioPart = { sfx: filename };
            newParts.push(part);
            haveNonTextAudio = true;
            // with audio, could also have the following 
            for ( let i=1; i<words.length; ++i ) {
              let word = words[i];
              switch( word.key ) {
                case "delay": {
                  if ( word.number ) {
                    part.delay = word.number;
                  } else {
                    console.error(`audio command had delay key but bad value: ${cmd}`);
                  }
                  break;
                }
                case "overlap": {
                  if ( word.number ) {
                    part.delay = -word.number;
                  } else {
                    console.error(`audio command had overlap key but bad value: ${cmd}`);
                  }
                  break;
                }
              } 
            }
          } else if ( matchAssetType(filename, validImageExtensions) ) {
            newParts.push({ img: filename });
          } else {
            console.error(`unrecognized command: ${cmd}, ${JSON.stringify(words)}`);
          }
        }
      }

    } else {
      // todo: still valid or error?
      console.error(`Looks like an empty command: ${cmd}`);
    }
    match = cmdRegex.exec(text);
  }

  // anything left is just text
  let remainder = text.substring(head).trim();
  if ( remainder ) {
    newParts.push({ txt: remainder });
  }

  if ( newParts.length > 0 ) {
    (newParts[newParts.length-1] as any).eol = true;
  }
  
  // if we did find VO, go back and tag all the txt elements 
  if ( lineVO !== undefined ) {
    for ( let part of newParts ) {
      if ( "txt" in part ) {
        part.vod = true;
      }
    }
  }

  newParts.forEach( p => parts.push(p) );
  
  if ( (lineVO !== undefined) && haveNonTextAudio ) {
    console.error("found both vo and audio items in a single line, this will likely not do what is expected, i.e. all audio items will just play at the start, over top of the voice over. You very likely want to mix the audio into the vo file instead.");
  }
}


function generateStep(story: Story): Step {
  const step: Step = {
    generatedTime: Date.now(),
    parts: [], 
    options: []
  };
  
  while ( story.canContinue ) {
    // next line of story
    let text = story.Continue();
    if ( text ) {
      parseLine( text, step.parts );
    }
  }
  
  const count = story.currentChoices.length; 
  for ( let i=0; i<count; ++i ) {
    let parts: LinePart[] = [];
    parseLine(story.currentChoices[i].text, parts);
    if ( parts.length === 0 ) {
      console.error(`option parsed to empty parts: ${story.currentChoices[1].text}`);
    }
    step.options.push({parts});
  }

  if ( story.currentChoices.length === 0 ) {
    step.storyEnded = true;
  }
 
  return step;  
}


export function begin(): Data {
  story.ResetState();
  const step = generateStep(story);

  const data: Data = {
    state: story.state.ToJson(), 
    lastStep: step,
    tags: {}
  };

  return data; 
}

export function step(persistentData: Data, choice: number): void {
  if ( !persistentData.state ) {
    console.error('tried to step the story before initializing it');
    return;
  }
  
  story.state.LoadJson(persistentData.state);
  story.ChooseChoiceIndex(choice);
  const step = generateStep(story);
  persistentData.lastStep = step;
  persistentData.state = story.state.ToJson();
}
