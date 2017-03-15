import * as express from "express";

interface IController {
    handler: express.Router;
}

export default IController;