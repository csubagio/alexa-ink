import {Colophon} from "./colophone";
import {OptionDefinition} from "./options";

export interface TextLine {
  txt: string;
  eol?: true;
  tts?: string;
}

export interface VOLine {
  vo: string;
}

export interface AudioLine {
  sfx: string;
  delay?: number;
}

export interface MusicLine {
  mus: string;
}

export interface ImageLine {
  img: string;
  eol?: true;
}

export interface SyncLine {
  sync: true;
}

export interface EndOfStoryLine {
  end: true;
  tts?: string;
}

export type LinePart = TextLine | VOLine | AudioLine | MusicLine | ImageLine | SyncLine | EndOfStoryLine;




export interface TransformedText {
  text: string;
  url?: string;
}

export interface TTSText {
  text: string;
  url: string;
}

export interface MessageFromSkill {
  colophon?: Colophon;
  appendPresentation?: LinePart[];
  setOptions?: OptionDefinition[];
  multipart?: boolean;
  hint?: string;
  transformed?: Record<string, TransformedText>;
  fromVoiceIntent?: boolean;
  tts?: Record<string, TTSText>;
}

export interface MessageToSkill {
  time?: number;
  selectOption?: number;
  nextMultipart?: boolean;
  speech?: string;
  transform?: Record<string, TransformedText>;
  endSession?: boolean;
  prompt?: boolean;
  startPurchase?: boolean;
} 