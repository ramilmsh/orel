var Base = require(path.join(__homedir, 'views/Base.js')),
    request = require('request');

parseResult = function (body) {
    body = JSON.parse(body);
    var data = [];
    for (var i = 0; i < body.length; ++i) {
        var _tmp = {
            'id': body[i].place_id,
            'lat': body[i].lat,
            'lon': body[i].lon,
            'name': body[i].display_name,
            'polygon': body[i].geojson.coordinates[0],
            'bbox': body[i].boundingbox || []
        };
        data.push(_tmp);
    }

    return data;
}

function View() {
    var self = this;

    self.render = function (req, res) {
        res.render('index');
    };

    self.search = function (req, res) {
        "use strict";
        var params = req.query,
            query;
        try {
            if (!req.params.hasOwnProperty('query'))
                throw new Error("Missing query string");

            query = {
                q: req.params.query,
                limit: parseInt(params.limit),
                lon: parseFloat(params.lng),
                lat: parseFloat(params.lat),
                lang: params.lang
            };

            for (let param in query)
                if (!query[param])
                    delete query[param];
        } catch (e) {
            console.error(e);
            res.end('{}');
        }

        request({
            method: "GET",
            uri: config.photon.protocol + '://' + config.photon.host + ':' + config.photon.port + '/api',
            headers: {
                "Content-Type": "application/json",
            },
            qs: query
        }, function (err, data) {
            if (err)
                res.end('{}'), console.log(err);

            try {
                data = JSON.parse(data.body);
                var response = [];
                if (params.hasOwnProperty("inst")) {
                    if (isNaN(query["limit"]))
                        query.limit = 3;

                    for (var i = 0; (i < query.limit) && (i < data.features.length); ++i)
                        response.push({
                            "name": data.features[i].properties.name,
                            "id": data.features[i].properties.osm_id,
                            "coordinates": data.features[i].geometry.coordinates
                        });

                    res.end(JSON.stringify(response));
                    return;
                }
                res.end(JSON.stringify(data));
            } catch (e) {
                console.error(e);
                res.end('{}');
            }
        });
    };

    self.reverse = function (req, res) {
        "use strict";

        var query = {
            lat: req.params.lat,
            lon: req.params.lng,
            lang: req.query.lang || "en"
        };

        if (!req.params.hasOwnProperty("lng") && !req.params.hasOwnProperty("lat"))
            throw new Error('Missing lat and lng');
        request({
            method: "GET",
            uri: config.photon.protocol + '://' + config.photon.host + ':' + config.photon.port + '/reverse',
            headers: {
                "Content-Type": "application/json"
            },
            qs: query
        }, function (err, data) {
            if (err)
                res.end('{}'), console.log(err);

            res.end(data.body);
            return;
        });
    };


    self.dir = function (req, res) {
        res.end('something');
    };

    return self;
}

View.prototype = new Base();

module.exports = View;
