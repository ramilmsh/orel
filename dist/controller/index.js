"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const tiles_1 = require("./tiles");
class Controller {
    constructor() {
        this.handler = express.Router();
        this.middleware();
        this.routes();
    }
    middleware() {
        this.handler.use("/tiles", tiles_1.tiles.handler);
    }
    routes() {
    }
}
let controller = new Controller();
exports.controller = controller;
