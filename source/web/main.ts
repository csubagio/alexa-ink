import {beginAlexa} from "./alexa";
import {pushDebug, setupLocalTesting} from "./debug";
import {setClock} from "./footer";
import {fadeOutOverlay} from "./overlay";
import {animate} from "./storyWriter";
import {setupSelector} from "./selector";

function onResize() {
  if ( window.innerHeight > window.innerWidth ) {
    document.body.style.fontSize = '3.0vw';  
  } else {
    document.body.style.fontSize = '2.5vh';     
  } 
} 

export function main() {
  window.addEventListener('resize', onResize);
  onResize();
  setClock(); 
  setupSelector();
    
  if ( location.origin === 'file://' ) {
    pushDebug('no Alexa, starting local');
    setupLocalTesting();
    animate();
    setTimeout( fadeOutOverlay, 100 );
  } else {
    beginAlexa();
  } 
}