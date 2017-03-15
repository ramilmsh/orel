import * as express from "express";
import * as path from "path";
import * as bodyParser from "body-parser";
import IHandler from "../interface/IHandler";

class Handler implements IHandler {
    public handler: express.Router;

    constructor() {
        this.middleware();
        this.routes();
    }

    /**
     * Assigns middleware
     * 
     * @private
     * 
     * @memberOf Handler
     */
    private middleware(): void {

    }

    /**
     * Assigns routing
     * 
     * @private
     * 
     * @memberOf Handler
     */
    private routes(): void {
        let handler: express.Router = express.Router();
        handler.get("/", (req, res, next): void => {
            res.end("1");
        });

        this.handler = handler;
    }
}

let tiles: Handler = new Handler;
export {tiles};