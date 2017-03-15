import * as express from "express";
import * as path from "path";
import * as bodyParser from "body-parser";

import { Config, inject } from "utils/injection";
import IController from "interface/IController";

@inject
class Tiles implements IController {
    public handler: express.Router;
    private config: Config;

    constructor() {
        this.handler = express.Router();
        this.middleware();
        this.routes();
    }

    private middleware(): void {

    }

    private routes(): void {
        this.handler.get("/", (req, res, next): void => {
            res.end("1");
        });
    }
}

let tiles: Tiles = new Tiles;
export { tiles };