

const elements = {
  header: document.getElementById("header") as HTMLDivElement,
  title: document.getElementById("title") as HTMLSpanElement,
  byline: document.getElementById("byline") as HTMLSpanElement,
}
  
 
export function setTitle(title: string, byline: string) { 
  elements.title.innerText = title; 
  elements.byline.innerText = byline;
}  
