import {sounds} from "./sounds";
import {postSkillMessage, setPlayerIsUsingTouch} from "./alexa";
import {debugSpoofResponse} from "./debug";
import {LinePart} from "./alexaTypes";
import {StyleConfig} from "./styles";
import {hideSelector, attachSelector} from "./selector";

export interface OptionDefinition {
  parts: LinePart[];
  isDebug?: boolean;
}

let isCurrentlyDebugOptions = false;


const elements = {
  options: document.getElementById("options") as HTMLDivElement,
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





let nextOptions: OptionDefinition[] = [];
export function setOptions(options: OptionDefinition[]) {
  isCurrentlyDebugOptions = false;

  if ( document.activeElement ) {
    if ( "blur" in document.activeElement ) {
      (document.activeElement.blur as any)();
    }
  }
  
  for ( let el of elements.options.children ) {
    let s = el as HTMLSpanElement;
    s.style.transition = 'all 230ms ease-in';
    s.style.opacity = '0';
    let rot = (Math.random() > 0.5 ? 1 : -1) * 10 + Math.random() * 20;
    s.style.transform = `translate(0, 1em) rotate(${rot}deg)`;
    setTimeout( () => s.remove(), 240 );
  } 

  nextOptions = options;
}



export function showOptions() {
  const options = nextOptions;
  let delay = 50;

  let fontSize = '2em';
  let totalLength = 0;
  options.forEach( o => o.parts.forEach( p => totalLength += "txt" in p ? p.txt.length : 0 ) );
  if ( totalLength > 40 ) {
    fontSize = '1.75em';
  }
  if ( totalLength > 80 ) {
    fontSize = '1.5em';
  }
  
  const appearSound = sounds['option-appears.ogg'];
  const spans: HTMLSpanElement[] = [];
  for ( let li=0; li<options.length; ++li ) {   
    if ( options[li].isDebug ) {
      isCurrentlyDebugOptions = true;
    }
    let s = document.createElement('span'); 
    spans.push(s);
    s.innerText = textFromParts( options[li].parts );  
    s.style.opacity = '0';
    let angle = 0;
    if ( StyleConfig.jauntyOptions ) {
      angle = Math.round( -2+4*Math.random() );
    }
    let startAngle = -5;
    if ( StyleConfig.jauntyOptions ) {
      startAngle = angle - ( 5 + 5 * Math.random() ) * ( Math.random() > 0.5 ? -1:1 );
    }
    
    s.style.transform = `translate(-1em,-0.6em) rotate(${startAngle}deg)`;
    s.style.transition = `all 300ms ease-out`;
    s.style.fontSize = fontSize;
    let first = li === 0;
    setTimeout( () => {
      s.style.opacity = '1';
      s.style.transform = `rotate(${angle}deg)`;  
      s.addEventListener('mousedown', (ev) => {ev.preventDefault(); ev.stopImmediatePropagation()} );
      s.addEventListener('click', clickOption);
      s.addEventListener('focus', () => {
        attachSelector(s);
      })
      appearSound?.play();
      if ( first ) { s.focus() }
    }, delay);
    elements.options.appendChild( s );         
    delay += 200;     
  }
}   
   
function clickOption(ev: MouseEvent) {
  setPlayerIsUsingTouch();
  for ( let i=0; i<elements.options.childNodes.length; ++i ) {
    if ( ev.target == elements.options.childNodes[i] ) {
      selectOption(i);
      break;
    }
  }
  ev.stopImmediatePropagation(); 
  ev.preventDefault();
  hideSelector();
}

function selectOption( number: number ) {
  for ( let ci=0; ci<elements.options.childNodes.length; ++ci ) {
    let el = elements.options.childNodes[ci] as HTMLSpanElement;
    el.removeEventListener('mousedown', clickOption);
    if ( ci === number ) {
      el.style.transition = "all 5000ms ease-in";
      el.style.opacity = "0.2";
      el.style.transform = `scale(1.3)`;
    } else {
      el.style.opacity = '0';
      el.style.transform = `translate(0, 2em)`;
    }  
  }
  sounds['option-selected.ogg']?.play();
  postSkillMessage({selectOption: number});
  
  if ( isCurrentlyDebugOptions ) {
    setTimeout( () => debugSpoofResponse(), 500 + Math.random() * 2000 );
  }
}

