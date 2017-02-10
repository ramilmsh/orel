var Base = require(path.join(__homedir, 'views/Base.js')),
    Tile = require('./tiles'),
    config = require(path.join(__homedir, 'config'))("tiles");

function View() {
    var self = this;
    self.tiles = new Tile(config);


    self.tile = function (req, res) {

        var handler,
            type;
        if (['png', 'jpeg', 'tiff'].indexOf(req.params.format) > -1) {
            type = Tile.RASTER;
            handler = function (err, buffer, header) {
                "use strict";
                // TODO log errors
                if (err) ;

                buffer = buffer || new Buffer(0);

                res.end(buffer);
            }
        } else if (['pbf'].indexOf(req.params.format) > -1) {
            type = Tile.VECTOR;
            handler = function (err, buffer, headers) {
                "use strict";
                if (err) {
                    // TODO log errors
                    res.status(404).end();
                    return;
                }

                buffer = buffer || new Buffer(0);
                headers = headers || {};

                if (req.params.format == 'pbf') {
                    headers['Content-Type'] = 'application/x-protobuf';
                    headers['Content-Encoding'] = 'gzip';
                }
                delete headers['ETag'];
                delete headers['Last-Modified'];
                res.set(headers);
                res.status(200).end(buffer);
            }
        } else {
            res.end('Unknown format');
            console.log(req.params.format);
        }

        self.tiles.render({
            x: req.params.x,
            y: req.params.y,
            z: req.params.z,
            scale: req.params.scale,
            source: req.query.source || config.default_source,
            type: type,
            // TODO figure out the source of the problem and remove
            new: (type === Tile.VECTOR)
        }, handler);
    };

    return self;
}

View.prototype = new Base();

module.exports = View;
