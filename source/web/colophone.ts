import {colophon} from "../lambda/storyData";
import {ValidStyles} from "./styles";

export interface Colophon {
  title: string;
  author: string;
  style: typeof ValidStyles[number];
  theEnd: string;
}

export const dummyColophone: Colophon = {
  title: "The Story",
  author: "The Author",
  style: "typewriter",
  theEnd: "The End."
}

export const theColophon: Colophon = JSON.parse(JSON.stringify(dummyColophone));

export function updateColophone( data: Colophon ) {
  for ( let k in data ) {
    (theColophon as any)[k] = (data as any)[k];
  }  
}

