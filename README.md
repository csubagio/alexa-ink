# Alexa + Ink

[Ink](https://www.inklestudios.com/ink/) is an open source interactive fiction engine made by Inkle Studios, used to drive hit games like 80 Days, Heaven's Vault and Overboard! It provides a great markdown like syntax for describing interaction flow, as well as extensive hooks to drive game client behavior outside of the story.

[Alexa](https://www.amazon.com/gp/browse.html?node=21576558011) is a digital personal assistant that runs on a large variety of hardware, including the Echo and Fire TV line of Amazon devices. [Alexa Skills](https://www.amazon.com/gp/browse.html?node=13727921011) is a mechanism to expand Alexa's capabilities, freely available to developers. Alexa customers can enable and pay for new skills in the Alexa Skill Store. Alexa enabled devices with screens, support running skills that in turn [launch an HTML5 game](https://developer.amazon.com/en-US/docs/alexa/web-api-for-games/alexa-games-about.html) on the device, automatically granting the game access to the wide range of Alexa skill features. 

This repository contains a variety of components that are useful when constructing an Alexa game using Ink. To create a working game, you'll first need to write an Ink story, and then construct an Alexa skill to present it to Alexa customers. This repository is a template for that, which you can deploy for free using Alexa Hosted Skills.
1. Use any editor you like to write an Ink story. Inkle's own [Inky](https://github.com/inkle/inky) is fantastic for this, as you can directly play your story as you're writing it. 
1. Log into the [Amazon developer portal](https://developer.amazon.com) with your Amazon account, and then create a free new Alexa Hostes Skill specifying this repo `https://github.com/csubagio/alexa-ink` as a template in the creation wizard. Enabling testing on the skill will automatically make it available on any of your devices.
1. Use the Alexa code editor to replace the contents of the story.ink file with your story.
1. Deploy the skill and enjoy your game!

For more details, see [the documentation site.](https://csubagio.github.io/alexa-ink/)