
function cleanTTS(text: string): string {
  // can't have <i> tags like in the sample story
  text = text.replace(/\<i\>/g, ' ');
  text = text.replace(/\<\/i\>/g, ' ');
  // these brackets don't make sense
  text = text.replace(/[\[\]]/g, ' ');
  // these read wrong
  text = text.replace(/\-/g, ' ');  
  // clean up any extra space
  text = text.replace(/\s+/g, ' ');
  return text;
}

export function cleanAndWrapSSML( text: string ): string {
  text = cleanTTS(text);
  text = `<speak><amazon:domain name="long-form">${text}</amazon:domain></speak>`;
  return text;
}

export function cleanAndWrapSSMLAPLA( text: string ): string {
  text = cleanTTS(text);
  text = `<speak>${text}</speak>`;
  return text;
}