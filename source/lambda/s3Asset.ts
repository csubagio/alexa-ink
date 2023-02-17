export let getS3PreSignedUrl: (url: string) => string;
export function setS3Signer( fn: (url: string) => string ) {
  getS3PreSignedUrl = fn;
}



export function resolveAssetURL(key: string): string | undefined {
  key = key.trim();
  
  if ( key.indexOf('http://') === 0 || key.indexOf('https://') === 0 ) {
    return key;
  }

  if ( key.indexOf('host:') === 0 ) {
    if ( getS3PreSignedUrl ) {
      return getS3PreSignedUrl("Media/" + key.replace('host:', ''));
    } else {
      console.error(`tried to sign hosted bucket file reference without an s3 signer being set.`);
    }
  }

  console.error(`asset URL found with no way to resolve it: "${key}"`);
  
  return;
}

