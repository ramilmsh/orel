/* jshint esversion: 6 */

/** @module Tile */
(function () {
    "use strict";
    var MBTiles = require('mbtiles'),
        path = require('path'),
        mbgl = require(path.join(__homedir, 'utils/mapbox-gl-native')),
        SphericalMercator = require('sphericalmercator'),
        sharp = require('sharp'),
        fs = require('fs'),
        zlib = require('zlib'),
        url = require('url'),
        advancedPool = require('advanced-pool'),

        mercator = new SphericalMercator({
            size: 256
        });

    mbgl.on('message', function (msg) {
        console.log(msg);
    });

    /**
     * Class that controls rendering tiles
     * @param {Object} config
     * @param {Object} config.data
     * @param {Array} config.pool_sizes
     * @param {Array} config.vector_tiles
     * @returns {*}
     * @constructor
     */
    var Tile = function (config) {

        var self = this;

        /**
         * Initializes the Tile class
         */
        constructor: {
            if (!config)
                return new Error("'config' is required");

            var defaults = {
                data: []
            };

            config = Object.assign({}, defaults, config);

            self.vectorRenderers = {};
            self.rasterRenderers = {};


            var styleJSON = fs.readFileSync(path.join(__dirname,
                config.styles_dir, 'styles', config.style + '.json'));
            styleJSON = JSON.parse(styleJSON);

            // For every source provided, create raster and vector renderer
            for (var source in config.data) {

                new MBTiles(path.join(__homedir, config.data[source]), (err, mbtiles) => {
                    if (err)
                        throw new Error(err);

                    self.vectorRenderers[source] = mbtiles;
                    // Getting information for specific data source
                    mbtiles.getInfo(function (err, data) {
                        if (err)
                            throw new Error('Error getting source info');

                        var _styleJSON = Object.assign({}, styleJSON),
                            _tileJSON = {tiles: config.vector_tiles};
                        _tileJSON.name = source;
                        _tileJSON.format = "pbf";

                        _tileJSON = Object.assign({}, _tileJSON, data);

                        _tileJSON.tilejson = "2.0.0";
                        _tileJSON.basename = source;
                        delete _tileJSON.scheme;

                        _styleJSON.sources.mapbox = _tileJSON;
                        _styleJSON.sources.mapbox.type = "vector";
                        _styleJSON.sprite = config.sprites + config.style;
                        _styleJSON.glyphs = config.glyphs;

                        fs.writeFile(path.join(__dirname, config.styles_dir, 'data', source + '.json'),
                            JSON.stringify(_styleJSON), function (err) {
                                if (err)
                                    throw err;
                            });
                        // Creating a pools for all scale ratios, starting with 1
                        self.rasterRenderers[source] = [null];
                        for (var i = 0; i < config.pool_sizes.length; ++i) {
                            self.rasterRenderers[source].push(new advancedPool.Pool({
                                // Passing parameters to mapbox-gl-native
                                create: Tile.createMBGLInstance.bind({
                                    params: {
                                        source: source,
                                        style: styleJSON,
                                        styles_dir: config.styles_dir,
                                        ratio: i + 1
                                    }, data: data,
                                    self: self
                                }),
                                destroy: function (rasterRenderer) {
                                    rasterRenderer.release();
                                },
                                // Provided in configuration
                                // an array of arrays for each scale level
                                min: config.pool_sizes[i][0],
                                max: config.pool_sizes[i][1]
                            }));
                        }
                    });
                });
            }
        }

        /**
         * Renders a tile
         * @param {Object} params
         * @param {Integer} params.x
         * @param {Integer} params.y
         * @param {Integer} params.z
         * @param {Integer} [params.scale=1]
         * @param {string} params.source: id of source to take data from
         * @param [params.type = 'vector']: raster or vector
         * @param {string} [params.format = 'pbf' | 'png']: file format
         * @param {Boolean} [params.new = false]: render new one
         * @param {Function} callback
         */
        self.render = function (params, callback) {
            if (!params.source)
                return callback(new Error("'source' parameter is required"));

            if (!self.vectorRenderers[params.source])
                return callback(new Error("Source " + params.source + " is undefined"));

            var x, y, z, scale;
            try {
                x = params.x = parseInt(params.x);
                y = params.y = parseInt(params.y);
                z = params.z = parseInt(params.z);
                params.scale = params.scale || '@1x';
                scale = params.scale = parseInt(params.scale[1]);
            } catch (e) {
                console.log(e);
                return callback(new Error('Invalid parameters', params));
            }

            params.type = params.type || Tile.VECTOR;
            params.format = params.format ||
            (params.type === Tile.RASTER) ? 'png' : 'pbf';


            // If the tile has already been pre-rendered -> just serve it
            if (!params.new) {
                var buffer = self.cache(params, Tile.READ_CACHE);
                if (buffer)
                    callback(null, buffer);
            }

            switch (params.type) {
                case Tile.VECTOR:
                    self.vectorRenderers[params.source].getTile(z, x, y, function (err, buffer, headers) {
                        if (err)
                            return callback(err, new Buffer(0));

                        callback(null, buffer, headers);
                        self.cache(params, Tile.WRITE_CACHE, buffer);
                    });
                    break;

                case Tile.RASTER:
                    var center = mercator.ll([
                        ((x + 0.5) / (1 << z)) * (256 << z),
                        ((y + 0.5) / (1 << z)) * (256 << z)
                    ], z);

                    z = Math.max(0, z - 1);

                    var pool = self.rasterRenderers[params.source][scale];
                    pool.acquire(function (err, rasterRenderer) {
                        rasterRenderer.render({
                            center: center,
                            zoom: z,
                            bearing: 0,
                            pitch: 0,
                            width: 256,
                            height: 256
                        }, function (err, buffer) {
                            pool.release(rasterRenderer);
                            if (err)
                                return callback(err);

                            var image = sharp(buffer, {
                                raw: {
                                    width: 256 * scale,
                                    height: 256 * scale,
                                    channels: 4
                                }
                            });

                            image.toFormat(params.format);
                            image.toBuffer(function (err, buffer, info) {
                                if (err)
                                    return callback(err);

                                callback(null, buffer);
                                self.cache(params, Tile.WRITE_CACHE, buffer);
                            });
                        });
                    });
                    break;

                default:
                    callback(new Error('Unknown tile type', params.type));
                    break;
            }


        };

        return self;
    };

    /**
     * Read/Write from cache
     * @static
     * @param {Object} params
     * @param {Integer} params.x
     * @param {Integer} params.y
     * @param {Integer} params.z
     * @param {string} params.format: file format
     * @param {Number} method: Tile.READ_CACHE|Tile.WRITE_CACHE
     * @param {Buffer} [data]: buffer to be written to cache
     * @returns {Buffer|Boolean|null}
     */
    Tile.prototype.cache = function (params, method, buffer) {
        switch (method) {
            case Tile.READ_CACHE:
                try {
                    buffer = fs.readFileSync(path.join(__dirname, 'cache',
                        (params.type === Tile.RASTER) ? 'raster' : 'vector',
                        params.z.toString(), params.x.toString(), params.y.toString() +
                        ((params.scale > 1) ? '@' + params.scale + 'x' : '') + '.' + params.format));

                    return buffer;
                } catch (e) {
                    return null;
                }
                break;

            case Tile.WRITE_CACHE:
                var type = (params.type === Tile.VECTOR) ? 'vector' : 'raster',
                    cur_path = __dirname,
                    _path = ['cache', type, params.z, params.x];

                for (var i in _path) {
                    cur_path = path.join(cur_path, _path[i].toString());
                    !fs.existsSync(cur_path) && fs.mkdirSync(cur_path);
                }


                fs.writeFile(path.join(__dirname, 'cache', type,
                    params.z.toString(), params.x.toString(), params.y.toString() +
                        ((params.scale > 1) ? '@' + params.scale + 'x' : '') + '.' + params.format),
                    buffer, function (err) {
                        if (err)
                            console.error(err);
                    });

                break;

            default:
                break;
        }
    };

    /**
     * Creates an instance of mapbox-gl-native
     * @static
     * @param {Object} params
     * @param {String} params.source: Source Id
     * @param {String} params.style: Style Id
     * @param {Integer} params.ratio: Ratio
     * @param {string} params.styles_dir
     * @param {Object} sourceInfo: MBTiles source info
     * @returns {mbgl.Map|Error}
     */
    Tile.createMBGLInstance = function (acquireCallback) {
        // Getting bound parameters
        var params = this.params,
            sourceInfo = this.data,
            self = this.self;

        var map = new mbgl.Map({
            request: function (req, callback) {
                // Getting data according to protocol acquired
                req.url = req.url.split('://');
                var protocol = req.url[0],
                    data = req.url[1];

                switch (protocol) {
                    case 'sprites':
                        try {
                            data = decodeURI(data);
                            fs.readFile(path.join(__dirname, params.styles_dir, 'sprites', data), function (err, buffer) {
                                callback(err, {data: buffer});
                            });
                        } catch (e) {
                            callback(new Error('Sprite ' + data + ' not found'));
                        }
                        break;

                    case 'glyphs':

                        try {
                            data = decodeURI(data);
                            fs.readFile(path.join(__dirname, params.styles_dir, 'glyphs', data), function (err, buffer) {
                                callback(err, {data: buffer});
                            });
                        } catch (e) {
                            callback(new Error('Glyph ' + data + ' not found'));
                        }
                        break;

                    case 'mbtiles':
                        // Data in format {source}/{z}/{x}/{y}
                        data = data.split('/');

                        // Get the vector tile
                        self.render({
                            x: data[2],
                            y: data[3],
                            z: data[1],
                            source: data[0],
                            type: Tile.VECTOR
                        }, function (err, buffer, headers) {
                            // If callback(err) is called, the instance of renderer will fail
                            if (err)
                                return callback(null, new Buffer(0));

                            buffer = zlib.unzipSync(buffer || '');
                            callback(null, {data: buffer});
                        });

                        break;

                    default:
                        callback(new Error('Unknown protocol ' + protocol));
                        break;
                }

            },
            ratio: params.ratio
        });

        var styleJSON = params.style;

        // Adapt style to current data file
        styleJSON.sources.mapbox = sourceInfo;
        styleJSON.sources.mapbox.tiles = ['mbtiles://' + params.source + '/{z}/{x}/{y}'];
        styleJSON.sources.mapbox.type = 'vector';
        delete styleJSON.sources.mapbox.scheme;


        map.load(styleJSON);
        acquireCallback(null, map);
    };

    // Defining rending modes
    Tile.VECTOR = 1;
    Tile.RASTER = 2;

    // Defining cache actions
    Tile.READ_CACHE = 1;
    Tile.WRITE_CACHE = 2;

    module.exports = Tile;
})();
