import {colophon} from "../lambda/storyData";
import {ValidStyles} from "./styles";

export interface Colophon {
  title: string;
  author: string;
  introduction: string;
  resumption: string;
  ending: string;
  style: typeof ValidStyles[number];
}

export const dummyColophone: Colophon = {
  title: "The Story",
  author: "The Author",
  introduction: "This is The Story, by The Author.",
  resumption: "Resuming The Story, by The Author.",
  ending: "The End.",
  style: "typewriter",
}

export const theColophon: Colophon = JSON.parse(JSON.stringify(dummyColophone));

export function updateColophone( data: Colophon ) {
  for ( let k in data ) {
    (theColophon as any)[k] = (data as any)[k];
  }  
}

