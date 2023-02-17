import * as ASKModel from "ask-sdk-model"
import * as ASKCore from 'ask-sdk-core'
import {Step} from "./storyData";

export interface StoryBuildItems {
  apla?: ASKModel.interfaces.alexa.presentation.apla.RenderDocumentDirective;
  apl?: ASKModel.interfaces.alexa.presentation.apl.RenderDocumentDirective;
  html?: ASKModel.interfaces.alexa.presentation.html.HandleMessageDirective;
  speech?: string;
  entities?: ASKModel.dialog.DynamicEntitiesDirective;
  
  directives: ASKModel.Directive[];
}

