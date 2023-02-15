import * as ASK from "ask-sdk-model"

/** Slot information parsed from an Alexa IntentRequest */
interface Slot<ValueType> {
  /** The original ASK SDK Slot value */
  slot: ASK.Slot;
  
  /** The slot's top level value as a string */  
  raw?: string;

  /** When this slot is a custom slot type, this is explicitly that type's generated enum and will be undefined if any other value is recognized */
  value?: ValueType;
  
  /** When we have values in the slot resolvers, this will be the ID of the most confident value */
  id?: string;
  
  /** helper that wraps parsing the raw value as number, returns undefined if the slot does not contain one */
  asNumber: () => number | undefined;
}

/** All custom slot types get a yourSlotTypeNameValues object below that contains all your value and synonym strings */
type SlotValues = Record< string, string[] >;

interface GenericIntent {
  name: string;
  request: ASK.Request;
  slots: Record<string, Slot<string>>;
}

type IntentSlotMapping = Record<string, Record< string, SlotValues > >;

export const Invocation = "Ink Story";

export enum Option {
  this_is_a_dummy_option_that_will_be_replaced = "this is a dummy option that will be replaced",
}

export const OptionValues = {
  "this is a dummy option that will be replaced": []
};

export interface SelectOption {
  name: "SelectOption";
  request: ASK.Request;
  slots: {
    option?: Slot<Option>;
  }
}

export interface OptionOnly {
  name: "OptionOnly";
  request: ASK.Request;
  slots: {
    option?: Slot<Option>;
  }
}

export interface AMAZON_StartOverIntent {
  name: "AMAZON.StartOverIntent";
  request: ASK.Request;
  slots: {
  }
}

export interface AMAZON_HelpIntent {
  name: "AMAZON.HelpIntent";
  request: ASK.Request;
  slots: {
  }
}

export interface AMAZON_FallbackIntent {
  name: "AMAZON.FallbackIntent";
  request: ASK.Request;
  slots: {
  }
}

interface _NotIntent {
  name: "_NotIntent";
  request: ASK.Request;
  slots: Record<string,Slot<string>>;
}

interface _InvalidInput {
  name: "_InvalidInput";
  request: ASK.Request;
  slots: Record<string,Slot<string>>;
}

const intentSlotMapping: IntentSlotMapping = {
  SelectOption:{
    option: OptionValues
  },
  OptionOnly:{
    option: OptionValues
  }
};

type Intents = SelectOption | OptionOnly | AMAZON_StartOverIntent | AMAZON_HelpIntent | AMAZON_FallbackIntent | _NotIntent | _InvalidInput;

export function parseAlexaRequest( request: ASK.Request ): Intents {
  if ( !request || typeof(request) !== 'object' ) {
    return { name: "_InvalidInput", request, slots: {} };
  }
  
  if ( request.type !== "IntentRequest" ) {
    return { name: "_NotIntent", request, slots: {} };
  }

  // we can uniformly convert any intent into our format
  // which will conform to the types we've defined
  // when they're recognized
  const slots: Record<string, Slot<string>> = {};
  const result: Intents = {
    name: request.intent.name,
    request,
    slots
  } as any as Intents;
  
  if ( request.intent.slots ) {
    const slotMapping = intentSlotMapping[result.name] || {};
    
    for ( const slotName in request.intent.slots ) {
      const slot: ASK.Slot = request.intent.slots[slotName];
      slots[slotName] = {
        value: undefined,
        raw: slot.value,
        slot,
        asNumber: (): number|undefined => {
          const v = parseFloat(slot.value || '');
          if ( isNaN(v) ) return undefined;
          return v;
        }
      }
      
      // try to find an exact match for one of our defined slots
      // there may not be one, in which case value remains undefined
      if ( slotMapping[slotName] ) {
        // map for quick case insensitive searching
        const valueMap: Record<string,string> = {};
        Object.keys(slotMapping[slotName]).forEach( v => valueMap[v.toLowerCase()] = v );
        const valueKeys = (Object.keys(valueMap));
        
        // is it the top level slot value?
        let test = (slot.value || "").toLowerCase();
        if ( slot.value && valueKeys.indexOf(test) >= 0 ) {
          slots[slotName].value = valueMap[test];
        } else {
          // no? dig into the resolution authorities then
          if ( slot.resolutions && slot.resolutions.resolutionsPerAuthority ) {
            slot.resolutions.resolutionsPerAuthority.forEach( auth => {
              if( auth.status.code !== "ER_SUCCESS_MATCH" ) { return }
              if ( auth.values ) {
                // take the most confident ID by default
                slots[slotName].id = auth.values[0].value.id;

                // but search for a bingo match when we're snapping
                // to custom slot type values
                for ( const authVal of auth.values ) {
                  test = authVal.value.name.toLowerCase();
                  if ( valueKeys.indexOf(test) >= 0 ) {
                    slots[slotName].value = valueMap[test];
                    slots[slotName].id = authVal.value.id;
                    break;
                  }
                }
              }
            });
          }
        }
      }
    }
  }
  
  return result;
}