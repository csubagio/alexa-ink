/**
 * Originally from https://github.com/csubagio/alexa-ink
 * 
 * This generic integration provides support for hosting an Ink
 * game on Alexa devices, both those with and without screens.
 *   
 * The repo it is distributed in, is formatted ot be compatible with the 
 * Alexa CLI tools, and the Alexa Hosted Skills feature. The handler
 * this file exports should be compatible with any nodejs based 
 * hosting solution though, feel free to paraphrase it as needed.
 * 
 * This skill will by default load the story in the story.ink
 * file in this same directory. Just replace the contents of that
 * file with your own to present your story instead!
 * 
 */




/**
 * This block initializes persistent storage for players using an 
 * AWS Dynamo DB table online. One is provided as part of the free 
 * infrastructure when you use Alexa Hosted Skills. 
 * If your needs differ, you can either switch out the adapter,
 * or provide your own data where the code below refers to the ASK
 * SDK's `attributesManager`.
 */
const AWS = require('aws-sdk')
const https = require('https');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');
const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({ 
    tableName : process.env.DYNAMODB_PERSISTENCE_TABLE_NAME,
    createTable: false,
    dynamoDBClient: new AWS.DynamoDB({
        apiVersion: 'latest', 
        region: process.env.DYNAMODB_PERSISTENCE_REGION,
        httpOptions: { agent: new https.Agent({keepAlive: true}) }
    })
});




const Alexa = require('ask-sdk-core');

const {LaunchProcessor, IntentProcessor, HTMLMessageProcessor, setS3Signer} = require('./game');
setS3Signer( require('./util').getS3PreSignedUrl );


/**
 * Note: per skill store guidelines, we must quit the skill when the customer says any StopIntent
 * */
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();
    }
};


/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs
 * 
 * There's nothing interesting we can do here, our app in the webview on device will have already been closed 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    }
};

/**
 * Generic error handling to capture any syntax or routing errors.
 * We'll just close the mic and expect the play will try whatever action it was again
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.error( error );
        const speakOutput = 'Sorry, there was an error. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(undefined)
            .getResponse();
    }
};

/**
 * This handler only kicks in if we've asked the question in ProcessHTMLMessageHandler
 * about whether the customer wants to transition to the skill store.
 * */
const PurchaseConfirmationHandler = {
    canHandle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && sessionAttributes.waitingForPurchaseConfirmation;
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const intent = Alexa.getIntentName(handlerInput.requestEnvelope);
        if ( intent === 'AMAZON.YesIntent' ) {
            // positive confirmation, go to the store
            sessionAttributes.waitingForPurchaseConfirmation = false;
            return handlerInput.responseBuilder
                .addDirective({
                    type: "Connections.SendRequest",
                    name: "Buy",
                    payload: {
                        InSkillProduct: {
                            productId: sessionAttributes.purchaseProductId,
                        }
                    },
                    token: "correlationToken"
                })
                .withShouldEndSession(undefined)
                .getResponse();
        } else if ( intent === 'AMAZON.NoIntent' || intent === 'AMAZON.CancelIntent' ) {
            // negative confirmation, just back off and wait for the next thing
            sessionAttributes.waitingForPurchaseConfirmation = false;
            return handlerInput.responseBuilder
                .withShouldEndSession(undefined)
                .getResponse();
        } else {
            // unsure, let's reprompt
            return handlerInput.responseBuilder
                .speak("I didn't get that. Do you want to open the skill store?")
                .withShouldEndSession(false)
                .getResponse();
        }
    }
};


/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestInterceptors( (handlerInput) => {
        // for debugging purposes we'll log every request we receive
        console.log(JSON.stringify(handlerInput.requestEnvelope));
    })
    .addResponseInterceptors( (handlerInput, response) => {
        // for debugging purposes we'll log every response we return
        console.log(JSON.stringify(response));
    })
    .addRequestHandlers(
        CancelAndStopIntentHandler,
        new LaunchProcessor,
        new IntentProcessor,
        new HTMLMessageProcessor,
        PurchaseConfirmationHandler,
        SessionEndedRequestHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('alexa-playcanvas-v1.0')
    .withPersistenceAdapter(dynamoDbPersistenceAdapter)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();