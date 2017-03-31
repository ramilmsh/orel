import * as express from "express";

import IController from "src/interface/IController";
import { tiles } from "./tiles";

class Controller implements IController {
    public handler: express.Router;

    constructor() {
        this.handler = express.Router();
        this.middleware();
        this.routes();
    }

    private middleware() {
        this.handler.use("/tiles", tiles.handler);
    }

    private routes() {
    }
}

let controller: Controller = new Controller();
export { controller };