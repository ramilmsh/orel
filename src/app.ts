import * as express from "express";
import * as http from "http";

import { controller } from "./controller";

let app: express.Application = express(),
    server: http.Server = http.createServer(app);

app.use("/", controller.handler);

server.listen(3000);

console.log(1);