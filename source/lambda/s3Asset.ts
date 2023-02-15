export let getS3PreSignedUrl: (url: string) => string;
export function setS3Signer( fn: (url: string) => string ) {
  getS3PreSignedUrl = fn;
}
