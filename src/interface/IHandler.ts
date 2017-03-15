import * as express from "express";

interface IHandler {
    handler: express.Router;
}

export default IHandler;