import {Colophon} from "./colophone";
import {OptionDefinition} from "./options";


export interface TextPart {
  txt: string; 
  tts?: string; // tts URL, if requested
  vod?: true; // do not TTS, replaced with a vo file
}

  /**
   * Indicates that all text content on this line 
   * should be replaced by this voice over audio 
   * instead.
   *  */ 
export interface VoiceOverPart {
  vo: string;  
}

export interface AudioPart {
  sfx: string;
  // By default, AudioPart will block the next thing
  // until the sound is complete, i.e. back to back.
  // Setting delay to a positive number instead begins
  // playing the next thing at that time. 
  // Setting it to a negative number begins playing 
  // the next audio that many seconds before the end 
  // of this AudioPart.
  delay?: number; // seconds
}

export interface MusicPart {
  // asks the player to switch the audio content playing 
  // in the music channel. There can only be up to one
  // thing playing in that channel.
  mus: string;
  loop?: boolean;
}

export interface ImagePart {
  // asks the story to display an image
  img: string;
}

export interface SyncPart {
  // indicates that the visuals and the audio should 
  // both reach this point before either continue
  sync: true;
}

export interface EndOfStoryPart {
  // represents the end of a story path, i.e. when there
  // are no further options to pick from.
  end: true;
  tts?: string; // if present, TTS of the colophone's theEnd
}

export interface EndOfLinePart {
  // this marker indicates that this was the end of a single
  // line in the Ink source. A single response may have several
  // lines
  eol?: true;
}

export type LinePart = TextPart | VoiceOverPart | AudioPart | MusicPart | ImagePart | SyncPart | EndOfStoryPart | EndOfLinePart;




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