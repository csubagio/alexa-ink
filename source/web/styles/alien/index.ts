
import {beginAlexa} from "../../alexa";
import {pushDebug, setupLocalTesting} from "../../debug";
import {setClock} from "../../footer";
import {fadeOutOverlay} from "../../overlay";
import {animate} from "../../storyWriter";

//declare const assets: Record<string,string>;
//document.body.style.backgroundImage = `url(${assets['paper.jpg']})`;

function onResize() {
  if ( window.innerHeight > window.innerWidth ) {
    document.body.style.fontSize = '3.0vw';   
  } else {
    document.body.style.fontSize = '2.5vh';     
  } 
}
window.addEventListener('resize', onResize);
onResize();

setClock(); 
  
if ( location.origin === 'file://' ) {
  pushDebug('no Alexa, starting local');
  setupLocalTesting();
  animate();
  setTimeout( fadeOutOverlay, 100 );
} else {
  beginAlexa();
} 



 