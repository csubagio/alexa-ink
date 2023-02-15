import {StyleConfig} from "./styles";

const elements = {
  selector: document.getElementById("selector") as HTMLDivElement,
}

const cornerInfo = [
  ['top', 'left'],
  ['bottom', 'left'],
  ['top', 'right'],
  ['bottom', 'right']
];

export function setupSelector() {
  const color = StyleConfig.selectorColor;
  const border = `0.3em solid ${color}`;
  for ( let info of cornerInfo ) {
    let corner = document.createElement('div');
    corner.classList.add('selector-corner');
    corner.style[info[0] as any] = '0';
    corner.style[info[1] as any] = '0';
    corner.style['border-' + info[0] as any] = border;
    corner.style['border-' + info[1] as any] = border;
    elements.selector.appendChild(corner);
  } 
}

(window as any).randomSelector = function() {
  let spans = document.getElementsByTagName('span');
  let span = spans[ Math.floor( Math.random() * spans.length) ];
  attachSelector( span );
} 

function moveSelector( x: number, y: number, w: number, h: number ) {
  elements.selector.style.left = `${x}px`;
  elements.selector.style.top = `${y}px`;
  elements.selector.style.width = `${w}px`;
  elements.selector.style.height = `${h}px`;
}

let attachedTo: HTMLElement = document.body;

export function attachSelector( el: HTMLElement ) {
  elements.selector.style.opacity = '1';
  attachedTo = el;
}

function animate() {
  let b = attachedTo.getBoundingClientRect();
  moveSelector(b.left, b.top, b.width, b.height);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

export function hideSelector() {
  elements.selector.style.opacity = '0';
  attachedTo = document.body;
}

hideSelector();
