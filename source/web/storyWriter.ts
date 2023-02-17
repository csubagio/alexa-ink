import {openMic} from "./alexa";
import {AudioPart, EndOfStoryPart, ImagePart, LinePart, SyncPart, TextPart} from "./alexaTypes";
import {theColophon} from "./colophone";
import {pushDebug} from "./debug";
import {showOptions} from "./options";
import {isTTSCached, playSound, playTTS, sounds} from "./sounds";
import {StyleConfig} from "./styles";


const elements = {
  story: document.getElementById("story") as HTMLDivElement,
}


const WordJoiner = String.fromCharCode(0x00002060); 




class FrameContext {
  isTyping = false;
  makeVisible?: number = undefined;
}

interface PageElement {
  isDone: boolean;
  begin(): void;
  update( ctx: FrameContext ): void;
  jumpToEnd(): void;
}


class TextElement implements PageElement {
  span: HTMLSpanElement;
  isDone = false;
  duration = 0;
  startTime = 0;
  
  constructor(public part: TextPart, public paragraph: HTMLParagraphElement) {
    const text = part.txt;
    this.span = document.createElement('span'); 
    paragraph.appendChild( this.span );
    if ( text.length === 0 ) {
      this.isDone = true;
      return;  
    }
    
    this.duration = Math.floor( text.length / 50 * 1000 );
  }

  begin() {
    this.startTime = Date.now();
  }
  
  update( ctx: FrameContext ) {
    if ( this.isDone ) { 
      return;
    } 
    
    const text = ' ' + this.part.txt;
    const now = Date.now();
    const n = Math.min( 1, ( now - this.startTime ) / this.duration );
    
     
    const split = Math.floor( text.length * n );
    this.span.innerHTML = text.substring(0,split) + WordJoiner;

    if ( n < 1 ) {
      const cursor = document.createElement('span');
      cursor.classList.add('cursor');
      cursor.innerHTML = StyleConfig.cursorCharacter; 
      this.span.appendChild(cursor);
      this.span.append(WordJoiner);
      
      const after = document.createElement('span');
      after.classList.add('story-hidden');
      after.innerText = WordJoiner + text.substring(split);
      this.span.appendChild(after);

      const rect = cursor.getBoundingClientRect();
      ctx.makeVisible = ctx.makeVisible || 0;
      ctx.makeVisible = Math.max( ctx.makeVisible, cursor.offsetTop + rect.height );
    }
    
    ctx.isTyping = true;
    this.isDone = n >= 1;
  }
  
  jumpToEnd(): void {
    if ( this.isDone ) {
      return;
    }
    this.isDone = true;
    this.span.innerText = ' ' + this.part.txt;
  }
}
 

class ImageElement implements PageElement {
  isDone = false;
  startTime = 0;
  img: HTMLImageElement;
  delay = 1000;
  ready = false;
  
  constructor(public part: ImagePart, public paragraph: HTMLParagraphElement) {
    this.img = document.createElement('img') as HTMLImageElement; 
    this.img.onload = ( () => this.ready = true );
    this.img.onerror = ( () => this.ready = true );
    this.img.src = part.img;
    paragraph.prepend( this.img );
  }
 
  begin(): void {
    this.startTime = 0; 
  }

  update(ctx: FrameContext): void {
    if ( !this.ready ) {
      return;
    }
    if ( this.startTime === 0 ) {
      this.startTime = Date.now();
    }
    if ( !this.img.classList.contains('show') ) {
      this.img.classList.add('show');
    }
    this.isDone = (Date.now() - this.startTime) > this.delay;
    const rect = this.img.getBoundingClientRect();
    ctx.makeVisible = ctx.makeVisible || 0;
    ctx.makeVisible = Math.max( ctx.makeVisible, this.img.offsetTop + rect.height );
  }
 
  jumpToEnd(): void {
    this.img.classList.add('show');
  }
} 


class VoiceOverElement implements PageElement {
  isDone = false;
  preDelay = 0;
  startTime = 0;
  started = false;
  ended = false;
  
  constructor( public part: TextPart|EndOfStoryPart, public first: boolean ) {
    if ( !first ) {
      this.preDelay = 250 + Math.floor( Math.random() * 500 );
    }
    if ( "end" in part ) {
      this.preDelay = 1500;
    }
  }
  
  begin(): void {
    this.startTime = Date.now();
  }
  
  update(ctx: FrameContext): void {
    if ( !this.started ) {
      const since = Date.now() - this.startTime;
      if ( since > this.preDelay ) {
        this.started = true;
        if ( this.part.tts && isTTSCached(this.part.tts) ) {
          let key = this.part.tts;
          playTTS(key, () => this.ended = true );
        } else {
          this.ended = true;
        }
      }
    }
    
    if ( this.ended ) {
      this.isDone = true;
    }
  }
  
  jumpToEnd(): void {
    this.isDone = true;
  }
}

class SoundEffectElement implements PageElement {
  isDone = false;
  startTime = 0;
  started = false;
  ended = false;
  
  constructor( public part: AudioPart ) {
  }
  
  begin(): void {
    this.startTime = Date.now();
    playSound(this.part.sfx, () => this.ended = true, this.part.delay);
  }
  
  update(ctx: FrameContext): void {
    if ( this.ended ) {
      this.isDone = true;
    }
  }
  
  jumpToEnd(): void {
    this.isDone = true;
  }
}


class SyncElement implements PageElement {
  isDone = false;
  
  constructor( public part: SyncPart, public syncIndex: number ) {}
  
  begin(): void {}

  update(ctx: FrameContext): void {}

  jumpToEnd(): void {
    this.isDone = true;
  }
}

class OpenMicElement implements PageElement {
  isDone = false;
  
  constructor() {}
  
  begin(): void {
    if ( this.isDone ) {
      return;
    }
    openMic();
    this.isDone = true;
  }
  
  update(): void {}
  jumpToEnd(): void {
    this.isDone = true;
  }
}


class ShowOptionsElement implements PageElement {
  isDone = false;
  
  constructor() {}
  
  begin(): void {
    if ( this.isDone ) {
      return;
    }
    showOptions();
    this.isDone = true;
  }
  
  update(): void {}
  jumpToEnd(): void {
    this.isDone = true;
  }
}



class Thread {
  elements: PageElement[] = [];
  currentElement = 0;
  
  constructor(readonly name: string){}
  
  get isDone(): boolean {
    return this.currentElement >= this.elements.length;
  }
  
  get isEmpty(): boolean {
    return this.elements.length === 0;
  }
  
  get syncIndex(): number | undefined {
    const current = this.elements[this.currentElement];
    if ( !current ) {
      return undefined;
    }
    let index = (current as any).syncIndex as number;
    return index;
  }
  
  clearSync( index: number ) {
    const current = this.elements[this.currentElement];
    if ( !current ) {
      return undefined;
    }

    if ( current && ("syncIndex" in current) && (current.syncIndex === index) ) {
      current.isDone = true;
    } else {
      pushDebug(`${this.name}: bad element sync: couldn't find ${index}`);
    }
  }
  
  push( el: PageElement ) {
    this.elements.push( el );
    if ( this.elements.length === 1 ) {
      el.begin();
    }
  }
  
  update( ctx: FrameContext ): void {
    if ( this.currentElement >= this.elements.length ) {
      return;
    }
    
    const el = this.elements[this.currentElement];
    el.update(ctx);
    if ( el.isDone ) {
      this.currentElement++;
      const next = this.elements[this.currentElement];
      if ( next ) {
        next.begin();
      }
    }
  }
  
  jumpToEnd() {
    this.elements.forEach( el => {
      if (!el.isDone ) {
        el.jumpToEnd() 
      }
    });
  }
}


class StoryPage {
  root: HTMLDivElement;  
  visualThread = new Thread('visual');
  audioThread = new Thread('audio');
  paragraphs: HTMLParagraphElement[] = [];
  farthestDisplayRequest?: number;
  needsClear = false;
  
  constructor( public parts: LinePart[] ) {
    this.root = document.createElement('div');
    this.root.classList.add('page');
    elements.story.append(this.root);
     
    let paragraph = this.newParagraph();
    let syncID = 1;
    let storyEnded = false;
    for ( let part of parts ) {
      if ( "txt" in part ) {
        this.visualThread.push( new TextElement(part, paragraph));
        if ( part.tts ) {
          this.audioThread.push( new VoiceOverElement(part, this.audioThread.isEmpty ) );
        }
      } 
      
      if ( "sfx" in part ) {
        this.audioThread.push( new SoundEffectElement(part) );
      }
      
      if ( "img" in part ) { 
        this.visualThread.push( new ImageElement(part, paragraph));
        this.needsClear = true;
      }
      
      if ( "end" in part ) {
        paragraph = this.newParagraph('the-end');
        this.visualThread.push( new TextElement({txt:theColophon.ending}, paragraph));
        storyEnded = true;
        if ( part.tts ) {
          this.audioThread.push( new VoiceOverElement(part, this.audioThread.isEmpty ) );
        }
      }
      
      if ( "sync" in part && part.sync ) {
        this.visualThread.push( new SyncElement(part, syncID)); 
        this.audioThread.push( new SyncElement(part, syncID));
        syncID++;
      }

      if ( "eol" in part && part.eol ) { 
        paragraph = this.newParagraph();
      }
    }  
    
    for ( let p of this.paragraphs ) {
      if ( p.childElementCount === 1 ) {
        p.classList.add('single-part');
      }
    }
    
    // open mic after both are done
    this.visualThread.push( new ShowOptionsElement );
    this.visualThread.push( new SyncElement({sync: true}, syncID)); 
    this.audioThread.push( new SyncElement({sync: true}, syncID));
    
    if ( !storyEnded ) {
      this.audioThread.push( new OpenMicElement );
    }
    
    this.checkClear();
  }

  checkClear() {
    if ( this.needsClear ) {
      const clear = document.createElement('div');
      clear.innerHTML = "&nbsp;";
      clear.style.clear = 'both';
      this.root.appendChild(clear);
      this.needsClear = false;
    } 
  }
  
  newParagraph(className?: string): HTMLParagraphElement {
    this.checkClear();

    let p = document.createElement('p');
    if ( className ) {
      p.classList.add(className);
    }
    this.root.append(p);
    this.paragraphs.push(p);
    return p;
  }
  
  jumpToEnd() {
    this.visualThread.jumpToEnd();
    this.audioThread.jumpToEnd();
  }
  
  update( ctx: FrameContext ): void {
    this.visualThread.update(ctx);
    if ( ctx.makeVisible !== undefined ) {
      if ( this.farthestDisplayRequest !== undefined ) {
        ctx.makeVisible = Math.max( ctx.makeVisible, this.farthestDisplayRequest );
      }
      this.farthestDisplayRequest = ctx.makeVisible;
    }
    
    this.audioThread.update(ctx);

    let visualSync = this.visualThread.syncIndex;
    let audioSync = this.audioThread.syncIndex;
    if ( visualSync !== undefined && audioSync !== undefined ) {
      if ( visualSync === audioSync ) {
        this.visualThread.clearSync(visualSync);
        this.audioThread.clearSync(audioSync);
      } else if ( visualSync < audioSync ) {
        this.visualThread.clearSync(visualSync);
      } else if ( audioSync < visualSync ) {
        this.audioThread.clearSync(audioSync);
      }
    }
  }
}


let lastTime = 0;
let currentPage: StoryPage | undefined;
let autoScroll = true;
let targetScroll: number | undefined;
let shake = 0;
let shakeOffset = [0,0];
let clacking = false; 
let clack = 0;



export function animate() {
  const ctx = new FrameContext;
  currentPage?.update( ctx );

  if ( ctx.makeVisible !== undefined ) {
    targetScroll = ctx.makeVisible;
  }
  
  let deltaTime = Date.now() - lastTime;
  lastTime = Date.now();
  if ( deltaTime < 16 ) {
    deltaTime = 16; 
  } if ( deltaTime > 1000 ) { 
    deltaTime = 1000;
  }
  
  if ( autoScroll && targetScroll ) {
    let newTop = targetScroll - elements.story.getBoundingClientRect().height + 8;
    let delta = ( newTop - elements.story.scrollTop ) * Math.pow( 0.9, deltaTime );
    if ( delta > 1 ) {
      newTop = elements.story.scrollTop + delta;
    } else {
      //targetScroll = undefined;
    }
    elements.story.scrollTop = newTop;
  } 
   
  const clackingSound = sounds['clacking.ogg']; 
  if ( ctx.isTyping && !clacking ) {
    clackingSound?.loop(true);
    clackingSound?.rate(1.1 + Math.random() * 0.3);
    clackingSound?.play(); 
    clacking = true;
  }
   
  if ( !ctx.isTyping && clacking ) {  
    clackingSound?.stop();   
    sounds['clacking-end.ogg']?.play();
    clacking = false; 
  }

  if ( ctx.isTyping && (Date.now() > clack) ) {
    clack = Date.now() + Math.floor( 200 + Math.random() * 300 );
    clackingSound?.rate(0.8 + Math.random() * 0.6);
    if ( Math.random() > 0.5 ) { 
      clackingSound?.stop(); 
      clackingSound?.play(); 
    } 
  } 
 
  if ( StyleConfig.pageShaking ) {
    if ( ctx.isTyping && (Date.now() > shake) ) {
      shake = Date.now() + Math.floor( 100 + Math.random() * 50 );
      shakeOffset = [ Math.round(Math.random()*4), Math.round(Math.random()*2) ];
      elements.story.style.transform = `translate(${shakeOffset[0]}px, ${shakeOffset[1]}px)`; 
    }
    
    document.body.style.backgroundPositionX = `${shakeOffset[0]}px`;
    document.body.style.backgroundPositionY = `${shakeOffset[1] + elements.story.getBoundingClientRect().top - elements.story.scrollTop}px`;
  }

  requestAnimationFrame(animate);  
} 

export function pushStoryParts(parts: LinePart[]) {
  if ( currentPage ) {
    currentPage.jumpToEnd();
  }
  currentPage = new StoryPage( parts );
  autoScroll = true;
} 

export function resetStoryView() {
  elements.story.innerHTML = "<p>&nbsp;</p><p>&nbsp;</p>";
  currentPage = undefined;
  autoScroll = true;
}
 
resetStoryView();


window.addEventListener('wheel', () => {
  autoScroll = false;
})

elements.story.addEventListener('mousedown', () => {
  autoScroll = false;
})

elements.story.addEventListener('touchstart', () => {
  autoScroll = false;
})

elements.story.addEventListener('focus', () => {
  elements.story.blur();
})