import * as express from "express";
import * as http from "http";
import {tiles} from "./tiles";

let app: express.Application = express(),
    server: http.Server = http.createServer(app);

app.use("/tiles", tiles.handler);

server.listen(3000);

console.log(1);