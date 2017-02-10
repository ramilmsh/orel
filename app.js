"use strict";

// Request widely used modules
global.express = require('express');
global.path = require('path');
global.fs = require('fs');

var bodyParser = require('body-parser'),
    http = require('http'),
    pg = require('pg');

global.config = require('./config')('global');

global.__homedir = __dirname;

const spawn = require('child_process').spawn;
var otp, photon, otp_stream, photon_stream, timestamp = Date.now();

if (config.otp.enable) {
    fs.open(path.join(config.log.path, timestamp.toString() + '.otp.txt'), 'w', function (err, fd) {
        if (err)
            console.error(err);

        otp_stream = fd;
        otp = spawn('java', ['-jar', path.join(config.otp.path, config.otp.jar), '--server', '--bindAddress', config.otp.host,
            '--port', config.otp.port, '--autoReload', '--router', config.otp.routers.join(" "),
            '--basePath', config.otp.basePath]);

        var handler = function (err) {
            if (err)
                console.error(err);
        };

        otp.stdout.on('data', function (data) {
            fs.write(otp_stream, `stdout :: ${data}\n`, handler);
        });

        otp.stderr.on('data', function (data) {
            fs.write(otp_stream, `stdout :: ${data}\n`, handler);
        });

        otp.on('close', function (code) {
            fs.write(otp_stream, `closed with code :: ${code}`, handler);
        });

    });
}

if (config.photon.enable) {
    fs.open(path.join(config.log.path, timestamp.toString() + '.photon.txt'), 'w', function (err, fd) {
        if (err)
            console.error(err);

        photon_stream = fd;
        photon = spawn('java', ['-jar', path.join(config.photon.path, config.photon.jar),
            '-data-dir',path.resolve(config.photon.path), '-listen-ip', config.photon.host,
            '-listen-port', config.photon.port]);

        var handler = function (err) {
            if (err)
                console.error(err);
        };

        photon.stdout.on('data', function (data) {
            fs.write(photon_stream, `stdout :: ${data}\n`, handler);
        });
        photon.stderr.on('data', function (data) {
            fs.write(photon_stream, `stderr :: ${data}\n`, handler);
        });

        photon.on('close', function (code) {
            fs.write(photon_stream, `closed with code :: ${code}`, handler);
        });
    });
}

var app = express();

global.verbose = process.argv.indexOf('--verbose') == -1 ? 0 : 1;
verbose && console.log('verbose: on');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://' + config.server.host + ':' + config.server.port);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

//Defining all controllers
var files = fs.readdirSync('./controllers');
for (var i = 0; i < files.length; ++i) {
    if (~['Base.js', 'sample'].indexOf(files[i])) continue;

    var controller = require(path.join(__homedir, 'controllers', files[i]));
    app.use(controller.path, controller.handler);

    verbose && console.info(files[i] + ': listening ' + controller.path);
}

app.set('view engine', 'pug');
app.set('views', path.join(__dirname + '/views/templates'));

//Since no other middleware worked display 404
app.use(function (req, res) {
    res.status(404).render('404', {
        url: req.originalUrl
    });
});

http.createServer(app).listen(config.server.port, config.server.host, function (err) {
    if (err)
        throw new Error('Failed to runt the server');
    else
        console.info('Server running at', config.server.host + ':' + config.server.port);
});
