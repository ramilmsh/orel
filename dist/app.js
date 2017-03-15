"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const http = require("http");
const controller_1 = require("./controller");
let app = express(), server = http.createServer(app);
app.use("/", controller_1.controller.handler);
server.listen(3000);
console.log(1);
