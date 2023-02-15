import {StyleConfig} from "../../styles";

StyleConfig.cursorCharacter = '█';
StyleConfig.selectorColor = '#b0f09e';

declare const assets: Record<string,string>;

import {main} from "../../main";
main();  

let lettersDiv = document.createElement('div');
lettersDiv.id = "letters";
let letterLines: string[]  = [''];

const chars = `!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxyz{|}~ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïð              `;
const blocks = `▀	▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▐░▒▓▔▕▖▗▘▙▚▛▜▝▞▟`;

function pushLine() {
  if ( Math.random() > 0.9 ) {
    letterLines.push(' ');
    return;
  }
  let line = "";
  
  let len = 32 + Math.random() * 100;
  if ( Math.random() > 0.7 ) {
    line += "       ";
  }
  let source = chars;
  if ( Math.random() > 0.9 ) {
    source = blocks;
  }
  
  for ( let j=0; j<len; ++j ) {
    line += source[Math.floor(Math.random() * source.length)];
  }
  letterLines.push(line);
}

for ( let i=0; i<44; ++i ) {
  pushLine();
}
lettersDiv.innerText = letterLines.join('\n');

document.body.prepend(lettersDiv);

let last = Date.now();
let interval = 1000;
function animate() {
  if ( Date.now() - last > interval ) {
    last = Date.now();
    letterLines.shift();
    pushLine();
    lettersDiv.innerText = letterLines.join('\n');
    interval = 200 + Math.random() * 2000;
  }
  requestAnimationFrame( animate );
}
animate();