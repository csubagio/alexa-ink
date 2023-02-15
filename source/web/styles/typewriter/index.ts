import {StyleConfig} from "../../styles";
StyleConfig.pageShaking = true;
StyleConfig.jauntyOptions = true;
StyleConfig.selectorColor = "#8c3f3f";

declare const assets: Record<string,string>;
document.body.style.backgroundImage = `url(${assets['paper.jpg']})`;

import {main} from "../../main";
main(); 