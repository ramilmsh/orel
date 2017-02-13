"using strict";

import Browser from "./ui/browser";
import Logger from "./utils/logger";


let orel = {
    ui: null,
    utils: null
};

orel.ui = Browser;

orel.utils = {
    Logger: Logger
};

export {orel};
