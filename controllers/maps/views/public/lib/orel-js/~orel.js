/* jshint esversion:6 */
(function (window) {
    "use strict";
    let single_click_timeout, config, verbose = false;

    /**
     * Abstract class to manipulate all classes
     */
    class SubClass {
        constructor(parent) {
            this.parent = parent;
        }

        set parent(parent) {

            if (!(parent instanceof Orel))
                return new TypeError("Parent must be instance of Orel");

            this._parent = parent;
        }

        get parent() {
            return this._parent;
        }
    }

    /**
     * Initiates the map
     */
    class Orel {
        constructor(wrapper, cnf, v) {
            if (v)
                verbose = v;

            verbose && console.info("Stating initialization");
            this.html = new HTMLHandler(this, wrapper);
            config = cnf;

            this.type = config.type;

            // Assigning getters for all properties starting with _
            Object.getOwnPropertyNames(this).forEach(
                (property) => {
                    if (property[0] !== '_') return;
                    Object.defineProperty(this.__proto__, property.substring(1), {
                        get: function () {
                            return this[property];
                        }
                    });
                });

            this.init();
        }

        init() {
            switch (this.type) {
                case Orel.VECTOR:
                    Orel.loadlib(config.libraries.mapboxgl, () => {
                        this.initMapboxGL();
                    });
                    break;

                case Orel.RASTER:
                    Orel.loadlib(config.libraries.leaflet, () => {
                        this.initLeaflet();
                    });
                    break;

                default:
                    throw new TypeError("Unknown Map type");
            }
        }

        initMapboxGL() {
            let highlight;
            verbose && console.info("Loading mapboxgl");
            if (!mapboxgl)
                throw new Error("mapboxgl has not been initialized");

            let options = config.vector;
            options.container = this.html.containers.map;

            mapboxgl.Map.prototype.clear = function () {
                try {
                    this.removeLayer("points");
                } catch (e) {
                }
                this.off('render', highlight);
                this.map_clear = true;
            };

            mapboxgl.Map.prototype.add = function (object) {
                if (object instanceof Node && !(object instanceof Point)) {
                    this.getSource("Point").setData({
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [object.coords.lng, object.coords.lat]
                        },
                        "properties": {
                            "icon": "circle"
                        }
                    });

                    this.addLayer({
                        "id": "points",
                        "type": "symbol",
                        "source": "Point",
                        "layout": {
                            "icon-image": "{icon}-11"
                        }
                    });
                } else if (object instanceof Point) {
                    this.on('render', highlight = () => {
                        let int = setInterval(() => {
                            if (this.loaded()) {
                                clearInterval(int);
                                try {
                                    let filter = object.rendered ? ["==", "$id", object.id] : ["==", `$name_${config.lang}`, object.name],
                                        features = this.queryRenderedFeatures({
                                            filter: filter
                                        });

                                    if (features.length) {
                                        let data = features[0], paint, layout;
                                        paint = Object.assign({}, data.layer.paint, {
                                            "text-color": "#149662",
                                            "text-halo-width": 2
                                        });
                                        layout = Object.assign({}, data.layer.layout, {"text-field": `{name_${config.lang}}`});
                                        this.getSource("Point").setData(data);
                                        this.addLayer({
                                            "id": "points",
                                            "source": "Point",
                                            "type": "symbol",
                                            "layout": layout,
                                            "paint": paint
                                        });

                                    } else {
                                        this.add(new Node(null, object.coords));
                                    }

                                } catch (e) {
                                    console.error(e);
                                    try {
                                        this.clearLayer("points");
                                    } catch (e) {
                                    }
                                }
                            }
                        }, 20);

                    });

                    if (object.extent)
                        this.fitBounds(object.extent);
                    else
                        this.flyTo({
                            center: object.coords,
                            zoom: Math.max(12, this.getZoom())
                        });

                } else if (object instanceof PointGroup) {

                } else if (object instanceof Route) {

                } else
                    return new TypeError("Unknown object type");
            };

            this.map = new mapboxgl.Map(options);
            this.map.map_clear = true;

            this.map.on('load', () => {
                console.log(this.map.getStyle());
                if (options.navigation)
                    this.map.addControl(new mapboxgl.NavigationControl());

                this.map.addSource("Point", EmptyFeature);

                this.map.addSource("PointGroup", EmptyFeatureCollection);

                this.map.addSource("Route", EmptyFeatureCollection);

                // ------------------
                this.map.on('click', (e) => {

                    let features = this.map.queryRenderedFeatures(e.point, {
                        filter: ["==", "$type", "Point"]
                    });

                    if (features.length && features[0].layer.source !== "mapbox")
                        return;
                    console.log(features[0]);

                    single_click_timeout = setTimeout(() => {

                        if (features.length) {
                            if (!this.map.map_clear)
                                this.map.clear(), this.html.clear();

                            verbose && console.log('Adding Point');
                            let point = new Point(this, features[0]);

                            this.search(point, (err, data) => {
                                if (err)
                                    console.error(err);

                                if (!(data instanceof PointInfo))
                                    console.error(new Error("Invalid search results"));

                                if (data.extent)
                                    point.extent = data.extent;

                                this.map.add(point);
                                this.map.map_clear = false;

                            });

                        } else {
                            if (!this.map.map_clear)
                                return this.map.clear(), this.html.clear();

                            verbose && console.log('Adding Node');
                            let node = new Node(this, e.lngLat);
                            this.map.add(node);
                            this.map.map_clear = false;

                            this.search(node, (err, data) => {
                                if (err)
                                    console.error(err);

                                if (!(data instanceof Point))
                                    console.error(new Error("Invalid search results"));

                                this.html.display(data, HTMLHandler.NODE_INFO);
                            });

                        }
                    }, config.dblclick_timeout || 200);

                });

                // ------------------
                this.map.on('mousemove', (e) => {
                    let features = this.map.queryRenderedFeatures(e.point, {
                        filter: ["==", "$type", "Point"]
                    });
                    this.map.getCanvas().style.cursor = features.length ? config["cursor:hover"] : config.cursor;
                });

                // ------------------
                this.map.on('dblclick', () => {
                    clearTimeout(single_click_timeout - 1);
                    clearTimeout(single_click_timeout);
                });

            });
        }

        initLeaflet() {
            verbose && console.info("Loading leaflet");
            if (!L)
                throw new Error("mapboxgl has not been initialized");
            Orel.prototype.Map = L.Map;
        }

        search(query, callback) {
            if (query instanceof Node && !(query instanceof Point)) {
                Orel.ajax({
                    url: "reverse/",
                    at: [query.coords.lng, query.coords.lat],
                    qs: {
                        "lang": config.lang
                    },
                    success: (data) => {
                        callback(null, new Point(this, data.features[0]));
                    },
                    error: (err) => {
                        callback(err);
                    }
                });
            } else if (query instanceof Point) {
                Orel.ajax({
                    url: `search/${query.name}`,
                    qs: {
                        "lng": query.coords.lng,
                        "lat": query.coords.lat,
                        "lang": config.lang
                    },
                    success: (data) => {
                        callback(null, new PointInfo(this, data.features[0]));
                    },
                    error: (err) => {
                        callback(err);
                    }
                });
            } else if (typeof query === "string") {

            } else {
                callback(new Error("Unknown query type"));
            }
        }

        /**
         * A utility to send XMLHttpRequests
         * @param {Object} params: parameters of the request
         */
        static ajax(params) {
            let XHR = new XMLHttpRequest(),
                url = params.url;

            if (params.hasOwnProperty("at"))
                url += '@' + params.at.join(",");

            if (params.hasOwnProperty("qs")) {
                url += '?';
                for (let key in params.qs)
                    if (key[0] !== '_')
                        url += key + '=' + params.qs[key] + '&';

                url = url.slice(0, url.length - 1);
            } else if (params.hasOwnProperty("q"))
                url += '?' + params.q;

            XHR.onreadystatechange = function () {
                if (XHR.readyState === XMLHttpRequest.DONE) {
                    if (XHR.status === 200)
                        params.success && params.success(JSON.parse(XHR.responseText));
                    else
                        params.error && params.error(XHR);
                }
            };
            XHR.open("GET", url, true);
            XHR.send();
        }

        static extend() {

        }

        static loadlib(block, callback) {
            if (!(block instanceof Array))
                return new Error('First argument must be an Array');

            for (let i = 0; i < block.length; ++i) {
                let url = block[i];
                if (typeof url !== 'string')
                    return new Error('url must be a string');

                let ext = url.split('.').slice(-1)[0], lib = null, _lib;

                switch (ext) {
                    case 'js':
                        _lib = document.createElement('script');
                        _lib.src = url;
                        lib = _lib;
                        break;

                    case 'css':
                        _lib = document.createElement('link');
                        _lib.rel = 'stylesheet';
                        _lib.href = url;
                        break;

                    default:
                        return new Error('Unknown library extension');
                }

                try {
                    document.head.appendChild(_lib);
                    if (lib)
                        lib.onload = callback;
                } catch (e) {
                    return e;
                }
            }
        }

        set type(type) {
            switch (type) {
                case 'vector':
                    try {
                        let canvas = document.createElement("canvas"),
                            gl = canvas.getContext("webgl") ||
                                canvas.getContext("experimental-webgl");
                        if (gl && gl instanceof WebGLRenderingContext)
                            this._type = Orel.VECTOR;
                        else
                            throw new Error('Browser does not support webgl');
                    } catch (e) {
                        this._type = Orel.Raster;
                    }
                    break;

                case 'raster':
                    this._type = Orel.RASTER;
                    break;

                default:
                    this.type = 'vector';
                    return new Error('Unknown tile type');
            }
            return this._type;
        }
    }

    /**
     * Deals with DOM
     */
    class HTMLHandler extends SubClass {
        constructor(parent, wrapper) {
            super(parent);

            this.wrapper = wrapper;

            // Assigning getters for all properties starting with _
            Object.getOwnPropertyNames(this).forEach(
                (property) => {
                    if (property[0] !== '_') return;
                    Object.defineProperty(this.__proto__, property.substring(1), {
                        get: function () {
                            return this[property];
                        }
                    });
                });

            this.init();
        }

        init() {
            this.containers = {
                map: document.createElement('div')
            };

            this.containers.map.className = 'orel-map-container';

            for (let container in this.containers)
                if (container[0] !== '_')
                    this.wrapper.appendChild(this.containers[container]);

            if (!this.wrapper.hasOwnProperty('parentNode'))
                document.body.appendChild(this.wrapper);
        }

        display(data, method) {
            this.clear();
            switch (method) {
                case HTMLHandler.NODE_INFO:
                    if (!(data instanceof Point))
                        return new Error("Data must be instance of Point");

                    let box = document.createElement('div');
                    box.className = 'orel-node-info';
                    box.innerHTML = data.info;

                    this.wrapper.appendChild(box);
                    break;

                default:
                    return new Error("Unknown display method");
            }
        }

        clear() {
            verbose && console.log('Clearing HTML');

            nodeInfo: {
                let list = document.getElementsByClassName('orel-node-info');

                for (let i = 0; i < list.length; ++i)
                    this.wrapper.removeChild(list[i]);
            }
        }

        set wrapper(wrapper) {
            switch (typeof wrapper) {
                case 'string':
                    let _object = document.getElementById(wrapper);
                    if (!_object) {
                        _object = document.createElement('div');
                        _object.id = wrapper;
                    }
                    wrapper = _object;
                    break;

                case 'object':
                    if (!wrapper) {
                        wrapper = document.createElement('div');
                        wrapper.id = 'wrapper';
                    }
                    if (!(wrapper instanceof HTMLDivElement))
                        throw Error('The object must be instance of HTMLDivElement');
                    break;

                default:
                    throw Error('First argument must be a string or [object HTMLDivElement]');
            }
            this._wrapper = wrapper;
            return this._wrapper;
        }
    }

    /**
     * Deals with positional properties of a point
     */
    class Node extends SubClass {
        constructor(parent, coords = null) {
            super(parent);
            this.coords = coords;
        }

        get coords() {
            return this._coords;
        }

        set coords(coords) {
            if (typeof coords !== 'object' && typeof coords !== 'string')
                return new Error('First argument must be an object or a string');


            if (typeof coords === 'string')
                coords = JSON.parse(coords);

            if (coords instanceof Array)
                coords = {
                    lng: coords[0],
                    lat: coords[1]
                };

            let defaults = {
                lng: 0,
                lat: 0
            };

            coords = Object.assign({}, defaults, coords);


            this._coords = {
                lng: coords.lng,
                lat: coords.lat
            };
            return this._coords;
        }
    }

    /**
     * Deals with data concerning a point
     * @param {Orel} parent
     * @param {Object|String} [data = null]: geoJSON "Feature" object containing
     *                                       information about the point
     */
    class Point extends Node {
        constructor(parent, data = null) {
            super(parent);
            this.data = data;
        }

        /**
         * Parses geoJSON and returns normalized version of data
         * @param data
         */
        static parse(data) {

        }

        /**
         * Writes data on top of existing data
         * @param data
         */
        addData(data) {
            this._data = Object.assign({}, this._data, data);
            return this._data;
        }

        get info() {
            return `<p>${this.name}</p><p>${this.coords.lng.toFixed(5)}, ${this.coords.lat.toFixed(5)}</p>`;
        }

        get html() {
            return "";
        }

        get data() {
            return this._data;
        }

        set data(data) {
            this._data = {};
            if (!data)
                return this._data;

            this.coords = data.geometry.coordinates;
            this.name = data.properties[`name_${config.lang}`] || data.properties.name || '';
            this.rendered = data.hasOwnProperty("layer");
            this.id = this.rendered ? data.id : null;
            !data.id && delete data.id;

            this._data = data;
            return this._data;
        }
    }

    /**
     * Deals with data concerning a point
     * @param {Orel} parent
     * @param {Object|String} [data = null]: geoJSON "Feature" object containing
     *                                       information about the point
     */
    class PointGroup extends SubClass {
        constructor(parent) {
            super(parent);
        }
    }

    class Route extends SubClass {
        constructor(parent) {
            super(parent);
        }
    }

    class PointInfo extends SubClass {
        constructor(parent, data) {
            super(parent);
            this.data = data;
        }

        get html() {
            return JSON.stringify(data);
        }

        get data() {
            return this._data;
        }

        set data(data) {
            if (data.properties.hasOwnProperty("extent")) {
                let bbox = data.properties.extent;
                bbox = [[bbox[0], bbox[3]], [bbox[2], bbox[1]]];
                this.extent = bbox;
            }

            this._data = data;
        }
    }

    let EmptyFeature = {
        "type": "geojson",
        "data": {
            "type": "Feature",
            "properties": {},
            "geometry": null
        }
    }, EmptyFeatureCollection = {
        "type": "geojson",
        "data": {
            "type": "FeatureCollection",
            "features": []
        }
    };

    Orel.RASTER = Symbol();
    Orel.VECTOR = Symbol();

    HTMLHandler.NODE_INFO = Symbol();

    Orel.Map = Map;
    Orel.Point = Point;
    Orel.PointGroup = PointGroup;

    window.Orel = Orel;
})(window);
