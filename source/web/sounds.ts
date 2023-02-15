import {Howl} from "howler";
import {TTSText} from "./alexaTypes";
import {pushDebug} from "./debug";
import Base64 from "js-base64";

declare const assets: Record<string,string>;

export const sounds: Record<string, Howl> = {};
for ( let name of Object.keys(assets) ) {
  if ( name.indexOf('.ogg') < 0 ) { continue; }
  sounds[name] = new Howl({
    src:assets[name],
    format: 'ogg',
    autoplay: false
  });
}

class CacheItem {
  howl?: Howl;
  ttsData?: TTSText;
  url = "";
  pending = false;
  loadFailed = false;
  afterEnded: (() => void) | undefined;
  atTimeFn: (() => void) | undefined;
  atTimeOffset = 0;
  stopped = false; 

  constructor() {}
  
  loadSound( url: string ) {
    this.url = url;
    this.howl = new Howl({
      src: url,
      autoplay: false, 
      volume: 1.5
    })
    this.howl.on('end', () => this.onPlayEnded());
    this.howl.on('load', () => this.onReady());
    this.howl.on('loaderror', (id, err) => {
      pushDebug(`sound load failed: ${err}`);
      this.onLoadFailed();
    });
  }
  
  loadTTS( data: TTSText ) {
    this.ttsData = data;
    this.url = data.url;
    Alexa.utils.speech.fetchAndDemuxMP3(data.url)
    .then( (result) => {
      if ( 'audioBuffer' in result ) {
        let b64 = Base64.fromUint8Array(new Uint8Array(result.audioBuffer));
        this.howl = new Howl({
          src: `data:audio/mp3;base64,${b64}`,
          autoplay: false,
          volume: 1.5
        })
        this.howl.on('end', () => this.onPlayEnded());
        this.howl.on('load', () => this.onReady());
      } else {
        pushDebug(`failed to demux audio, ${result.message}`);
      }
    }).catch( (err) => {
      pushDebug(`error demuxing audio: ${err}`);
    });  
  }
  
  private playInternal() {
    this.stopped = false;
 
    if ( this.howl && this.howl.state() === "loaded" ) {
      if ( this.atTimeOffset ) {
        let delay = Math.round(this.atTimeOffset * 1000);
        if ( delay < 0 ) {
          delay = Math.round( this.howl.duration() * 1000 + delay );
        }
        setTimeout( () => {
          if ( !this.stopped && this.atTimeFn ) {
            this.atTimeFn();
            this.atTimeFn = undefined;
          }
        }, Math.floor( delay ) );
      }
      this.howl.play();
    } else if ( this.loadFailed ) {
      // skip for the sake of not getting stuck
      if ( this.atTimeFn ) {
        this.atTimeFn();
        this.atTimeFn = undefined;
      }
      if ( this.afterEnded ) {
        this.afterEnded();
        this.afterEnded = undefined;
      }
    } else {
      this.pending = true;
    }
  }
  
  onReady() {
    if ( this.pending ) { 
      this.playInternal(); 
    }
  }
  
  onLoadFailed() {
    this.loadFailed = true;
    if ( this.pending ) {
      this.playInternal();
    }
  }
  
  onPlayEnded() {
    if ( this.afterEnded ) {
      this.afterEnded();
      this.afterEnded = undefined;
    }
  }
    
  destroy() {
    this.stop(true);
  }
  
  play(after?: () => void, atTimeSeconds?: number) {
    this.pending = false;
    
    if ( atTimeSeconds !== undefined ) {
      this.atTimeFn = after;
      this.atTimeOffset = atTimeSeconds;
    } else {
      this.afterEnded = after;
    }
    
    if ( this.howl ) {
      if ( this.howl.playing() ) {
        this.howl.stop();
      }
    }
    
    this.playInternal();
  }
  
  stop(unload: boolean = false) {
    this.pending = false;
    this.stopped = true;
    this.afterEnded = undefined;
    if ( !this.howl ) {
      return;
    }
    if ( !this.howl.playing() ) {
      return;
    }
    let howl = this.howl;
    howl.fade( 1, 0, 200 );
    setTimeout( () => {
      howl?.stop();
      if ( unload ) {
        howl.unload();
      }
      this.howl = undefined;
    }, 200);
  }

}

let cache: Record<string, CacheItem> = {};

let currentTTS: CacheItem | null;

export function playTTS( key: string, after?: () => void, atTime?: number ) {
  if ( currentTTS ) { currentTTS.stop() }

  let next = cache[key];
  if ( !key ) {
    pushDebug(`failed to play tts ${key}, never cached`);
    return;
  }
  
  currentTTS = next;
  currentTTS.play(after, atTime);
}

export function playSound( url: string, after?: () => void, atTime?: number ) {
  let cached = cache[url];
  
  if ( !cached ) {
    cache[url] = cached = new CacheItem;
    cached.loadSound(url);
  }
  
  cached.play(after, atTime);
  return cached;
}


export function flushCache() {
  for ( let key in cache ) {
    cache[key].destroy();
  }
  cache = {};
}

export function cacheSound(url: string) {
  if ( cache[url] ) {
    return;
  }
  
  cache[url] = new CacheItem;
  cache[url].loadSound( url );
}

export function cacheTTS(key: string, data: TTSText){
  if ( cache[key] ) {
    const old = cache[key];
    if ( old.ttsData ) {
      pushDebug(`tts cache collision: ${key}: ${old.ttsData.text} ${old.ttsData.url} => ${data.text} ${data.url}`);
    } else {
      pushDebug(`tts cache collision: ${key}: [not tts?] ${old.url} => ${data.text} ${data.url}`);
    }
    old.destroy();
  }
  
  cache[key] = new CacheItem;
  cache[key].loadTTS(data);
}

export function isTTSCached(key?: string): boolean {
  if ( !key ) {
    return false;
  }
  return key in cache;
}