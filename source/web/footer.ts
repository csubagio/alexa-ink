import {supportsPushToTalk, supportsWakeWord, wakeWord} from "./alexa";
import {attachSelector} from "./selector";
import {sounds} from "./sounds";


const elements = {
  footer: document.getElementById("footer") as HTMLDivElement,
  clock: document.getElementById("clock") as HTMLSpanElement,
  settings: document.getElementById("settings") as HTMLSpanElement,
  help: document.getElementById("help") as HTMLSpanElement,
  
  helpWindow: document.getElementById("help-window") as HTMLDivElement,
  settingsWindow: document.getElementById("settings-window") as HTMLDivElement
}
   

export function setClock() {   
  let d = new Date;  
  let hour = d.getHours();
  let minutes = d.getMinutes(); 
  let ampm = hour > 11 ? 'pm' : 'am'; 
  if ( hour > 12 ) { hour -= 12; } 
  let hourString: string = hour < 10 ? '0' + hour : '' + hour;  
  let minutesString: string = minutes < 10 ? '0' + minutes : '' + minutes; 
  let parts: string[] = [
    hourString[0], hourString[1],  
    `<span class='clock-blink'>:</span>`,  
    minutesString[0], minutesString[1], ampm
  ]
  parts = parts.map( p => `<span class=clock-tile>${p}</span>` );
  elements.clock.innerHTML = parts.join('');
}
setInterval( setClock, 1000 * 60 );
 
 
  
class Panel {
  showing = false;
  timeout: any;
  
  constructor(public el: HTMLDivElement, public btn: HTMLSpanElement) {
    el.addEventListener('mousedown', (ev) => {
      ev.stopImmediatePropagation();
      ev.preventDefault(); 
      this.toggle();
    })

    btn.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    })
    
    btn.addEventListener('click', (ev) => {
      ev.stopImmediatePropagation();
      ev.preventDefault();
      this.toggle();
      sounds['footer-button.ogg']?.play();
    }) 
    
    btn.addEventListener('focus', () => {
      attachSelector(btn);
    })
    
    window.addEventListener('keydown', (ev) => {
      if ( this.showing ) {
        this.toggle();
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    });

    this.el.style.opacity = '0';
    this.el.style.transform = `translate(-50%,-60%) rotate(2deg)`;
  }

  toggle() {
    if ( this.showing ) {
      this.el.style.opacity = '0';
      this.el.style.transform = `translate(-50%,-60%) rotate(2deg)`;
      clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        this.el.style.display = 'none';
      }, 500); 
    } else { 
      this.el.style.opacity = '0';
      this.el.style.display = 'block';
      clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        this.el.style.opacity = '1';
        this.el.style.transform = `translate(-50%,-50%) rotate(-1deg)`; 
      }, 50);
    }
    this.showing = !this.showing;
  }
  
  jiggle() {
    let angle = ( -1 * Math.random() * 2 ).toFixed(2);
    let y = (-49 + Math.random() * 2).toFixed(2);
    this.el.style.transform = `translate(-50%,${y}%) rotate(${angle}deg)`; 
  }
  
  hide() {
    if ( this.showing ) {
      this.toggle();
    }
  }
}


const settings = {
  readStory: true,
  readOptions: true,
  soundEffects: true
};

type Settings = typeof settings;

interface SettingsControl {
  p: HTMLParagraphElement;
  text: string; 
}
 
class SettingsPanel extends Panel { 
  controls: Record<string, SettingsControl> = {};
  
  constructor(public el: HTMLDivElement, public btn: HTMLSpanElement) {
    super(el, btn);
    this.addSetting('readStory', 'read the story out loud');
    this.addSetting('readOptions', 'read the options out loud');
    this.addSetting('soundEffects', 'play sound effects');
    this.addDelete();
  } 
  
  addSetting(key: string, text: string) {
    let p = document.createElement('p') as HTMLParagraphElement;
    this.controls[key] = { p, text };
    p.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      let value = !(settings as any)[key];
      (settings as any)[key] = value;
      this.setSettingText(key);
      this.jiggle();
    });
    this.setSettingText(key);
    this.el.appendChild(p);
  }
 
  addDelete() {
    let p = document.createElement('p') as HTMLParagraphElement;
    p.classList.add('delete');
    p.innerText = 'restart the story';
    p.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      this.jiggle();
    }); 
    this.el.appendChild(p);
  }
     
  setSettingText(key: string) {
    let control = this.controls[key]; 
    if ( !control ) { return }
    let text = "";
    if ((settings as any)[key]) {
      text = `[<i>✓</i>] ${control.text}`;
    } else {
      text = `[<i>&nbsp;</i>] ${control.text}`;
    }
    control.p.innerHTML = text;
  }
}

const helpPanel = new Panel( elements.helpWindow, elements.help );
const settingPanel = new SettingsPanel( elements.settingsWindow, elements.settings );


window.addEventListener('mousedown', (ev) => {
  helpPanel.hide();
  settingPanel.hide();
})



const helpWithWakeWord = `This skill is an interactive story, where you control how it unfolds. After each turn, you'll be presented with one or more options, just say or tap the one you like to continue.
If you need time to think, just let the blue bar go away, and say "WAKEWORD" to pick it up again.
You can restart the story in the settings.`

const helpWithPushToTalk = `This skill is an interactive story, where you control how it unfolds. After each turn, you'll be presented with one or more options, just say the one you like to continue.
You can restart the story in the settings.`

const genericHelp = `This skill is an interactive story, where you control how it unfolds. After each turn, you'll be presented with one or more options, just say the one you like to continue.
You can restart the story in the settings.`

export function refreshHelpText() {
  let input = '';
  if ( supportsWakeWord ) {
    input = helpWithWakeWord.replace('WAKEWORD', wakeWord);
  } else if ( supportsPushToTalk ) {
    input = helpWithPushToTalk;
  } else {
    input = genericHelp;
  }
  
  let parts = input.trim().split('\n');
  parts = parts.map( p => `<p>${p}</p>` );
  elements.helpWindow.innerHTML = parts.join('');
}

refreshHelpText();

//setTimeout( () => helpPanel.btn.focus(), 100 );