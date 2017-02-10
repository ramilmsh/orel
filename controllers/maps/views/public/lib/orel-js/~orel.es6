/* jshint esversion: 6 */
(function () {
    "use strict";
    let verbose = 0,
        IML;


    class Orel {
        /**
         * Orel is the main class that initializes
         * all the element on the page
         * @param {Object} options
         * @param {String|Object} [DOMObject]
         * @param {Boolean} [vv = false]: verbose
         * @constructor
         */

        constructor(options, DOMObject = null, vv = false) {
            console.log(options);
            verbose = vv || 0;
            verbose && console.info("Initializing...");

            let defaults = {
                center: {
                    lat: 0,
                    lng: 0
                },
                extent: [
                    [-90, -180],
                    [90, 180]
                ],
                zoom: 0,
                zoomBnd: [],
                searchBar: false,
                boxHeight: null,
                boxWidth: null
            };
            options = Object.assign({}, defaults, options);

            // Initializing the map
            this.wrapper = wrapper;
            this.html = new Orel.HTMLHandler(this);
            this.map = options;
            this._state = {};
            this.searchBar = options.searchBar;
            this.busy = false;

            Object.getOwnPropertyNames(this).forEach(
                function (property) {
                    if (property[0] !== '_') return;
                    Object.defineProperty(Orel.prototype, property.substring(1), {
                        get: function () {
                            return this[property];
                        }
                    });
                });

            this.init();

            verbose && console.info("Orel initialized!");
        }

        /**
         * Set initial values, reads the url and sets the state
         */
        init() {
            /**
             * Initializes state from url
             * @type {string}
             */
                // To make it easier to navigate keeping the center and zoom in hash
                // #{centerLatitude},{centerLongitude},{zoomLevel}
            let coords = window.location.hash.substring(1),
                search = window.location.search.substring(1).split('&'),
                state = {};
            search.forEach(function (param) {
                let _temp = param.split('=');
                state[_temp[0]] = _temp[1] || true;
            });
            state.coords = coords.split(',');

            this.state = state;
        }

        /**
         * Interface to make request to the database, to look up a location
         * @param query
         * @param type
         * @param callback
         */
        static search(query, type, callback) {
            switch (type) {
                case Orel.SEARCH_LOCATION:
                    Orel.ajax({
                        url: "reverse/",
                        at: [query.coords.lng, query.coords.lat],
                        qs: {
                            "lang": "en"
                        },
                        success: callback
                    });
                    break;

                case Orel.SEARCH_NAME:
                    let qs = {
                        limit: 5,
                        lang: "en"
                    };
                    if (query.center)
                        Object.assign(qs, query.center);
                    Orel.ajax({
                        url: "search/" + query.name,
                        qs: qs,
                        success: callback
                    });
                    break;

                case Orel.INSTANT_SEARCH:
                    qs = {
                        limit: 3,
                        inst: 1,
                        lang: "en"
                    };
                    if (around)
                        Object.assign(qs, around);

                    Orel.ajax({
                        url: "search/" + query,
                        qs: {
                            limit: 3,
                            inst: 1,
                            lang: "en"
                        },
                        success: callback
                    });
                    break;

                default:
                    break;
            }
        }

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

        static loadlib(block, callback) {
            if (!(block instanceof Array))
                return new Error('First argument must be a string');

            for (let i = 0; i < block.length; ++i) {
                let url = block[i];
                if (typeof url !== 'string')
                    return new Error('url must be a string');

                let ext = url.split('.').slice(-1)[0], lib;

                switch (ext) {
                    case 'js':
                        lib = document.createElement('script');
                        lib.src = url;

                        lib.onload = callback;
                        lib.onreadystatechange = callback;
                        break;

                    case 'css':
                        lib = document.createElement('link');
                        lib.rel = 'stylesheet';
                        lib.href = url;
                        break;

                    default:
                        return new Error('Unknown library extension');
                }

                try {
                    document.head.appendChild(lib);
                } catch (e) {
                    return e;
                }
            }
        }

        set DOMObject(DOMObject) {
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
            this._DOMObject = wrapper;
            return this._DOMObject;
        }

        set map(options) {
            this._map = new Orel.Map(this.html, options);
        }

        set searchBar(searchBar) {
            if (!searchBar instanceof Boolean)
                throw Error('searchBar must be a Boolean');

            this.html.mode = Orel.SEARCH_MODE;
            this._searchBar = searchBar;
        }

        set options(options) {
            for (let property in options)
                this[property] = options[property];
        }

        set state(params) {

            // Checking argument types
            {
                // TODO perform checking
            }

            this._map.center = (params.coords.length !== 3) ? this._map.center : params.coords;
            // TODO do all the rest
        }
    }

    Orel.HTMLHandler = class {
        /**
         * Class that serves as interface to interact with DOM
         */
        constructor(parent) {
            let html = {
                html: document.getElementsByTagName('html')[0],
                body: document.getElementsByTagName('body')[0],
                dirWrapper: document.createElement('div'),
                searchWrapper: document.createElement('div'),
                mapWrapper: document.createElement('div'),
                featureListWrapper: document.createElement('div'),
                DOMObject: parent._DOMObject,
                parent: parent
            };
            Object.assign(this, html);

            this.init();
        }

        init() {
            this.mode = Orel.SEARCH_DISABLED;

            this.dirWrapper.className = 'orel-dir-wrapper';
            this.searchWrapper.className = 'orel-search-wrapper';
            this.mapWrapper.className = 'orel-map-wrapper';
            this.wrapper.className = 'orel-wrapper';
            this.featureListWrapper.className = 'orel-feature-list-wrapper';

            // TODO remove
            this.addInput(this.searchWrapper);

            // TODO add event listeners
            // TODO calculate sizes

            this.wrapper.appendChild(this.searchWrapper);
            this.wrapper.appendChild(this.dirWrapper);
            this.wrapper.appendChild(this.mapWrapper);
            this.wrapper.appendChild(this.featureListWrapper);
            !this.wrapper.parentNode && this.body.appendChild(this.wrapper);

            verbose && console.log('wrapper initialized');
        }

        addInput(parentNode) {
            let input = document.createElement('input'),
                button = document.createElement('div');
            input.className = 'orel-input';
            button.className = 'orel-search-button';
            // TODO change html layout
            button.onclick = input.onkeyup = (e) => {
                let keyCode = e.keyCode || e.charCode || e.which;
                (keyCode === 13 && e instanceof KeyboardEvent && e.target === input ||
                e instanceof MouseEvent && e.type === 'click' && e.target === button) &&
                Orel.search({
                    name: input.value,
                    center: this.parent.map.mapObject.getCenter()
                }, Orel.SEARCH_NAME, (data) => {
                    console.log(data);
                    this.displaySearchResults({data: data}, Orel.HTMLHandler.RESULT_LIST, this.parent.map);
                });
            };

            input.onfocus = () => {
                let handler = () => {
                    this.mapWrapper.removeEventListener('point_added', handler);
                };

                this.mapWrapper.addEventListener('point_added', handler);
            };

            parentNode.appendChild(input);
            return input;
        }

        displaySearchResults(argv, type) {
            let box, _data,
                data = argv.data;
            switch (type) {
                case Orel.HTMLHandler.RESULT_LIST:
                    this.clearFeatures();
                    for (let i = 0; i < data.features.length; ++i) {
                        this.displaySearchResults({
                            data: data.features[i]
                        }, Orel.HTMLHandler.FEATURE_SEARCH);
                    }
                    this.parent.map.clear(Orel.Map.POINT);
                    break;

                case Orel.HTMLHandler.POINT_SEARCH:
                    if (!data.features.length || !argv.point)
                        return;

                    data = data.features[0];
                    _data = "<p>" + data.properties.name + "</p>" +
                        "<p>" + data.geometry.coordinates[0].toFixed(5) + ", " +
                        data.geometry.coordinates[1].toFixed(5) + "</p>";
                    box = document.createElement('div');

                    box.className = "orel-point-data-box";
                    box.innerHTML = _data;

                    this.mapWrapper.appendChild(box);
                    argv.point.boxWrapper = this.mapWrapper;
                    argv.point.box = box;
                    box.onclick = () => {
                        this.displaySearchResults({
                            data: data,
                            point: argv.point
                        }, Orel.HTMLHandler.FEATURE_SEARCH);
                        this.mapWrapper.removeChild(box);
                    };
                    break;

                case Orel.HTMLHandler.FEATURE_SEARCH:
                    if (data.hasOwnProperty("features") && !data.features.length)
                        return;

                    data = data.hasOwnProperty("features") ? data.features[0] : data;

                    box = document.createElement('div');
                    box.className = "orel-feature-wrapper";
                    console.log(data);

                    _data = "<p>" + data.properties.name + "</p>" + "<p>" + [data.properties.city ||
                        data.properties.osm_value === "state" ? data.properties.name : data.properties.state,
                            data.properties.country].join(", ") + "</p>";
                    box.innerHTML = _data;

                    this.featureListWrapper.appendChild(box);
                    if (argv.hasOwnProperty("point")) {
                        argv.point.boxWrapper = this.featureListWrapper;
                        argv.point.box = box;
                    }

                    box.onclick = () => {
                        this.parent.map.add(data, Orel.Map.FEATURE);
                    };

                    break;

                case Orel.HTMLHandler.DIRECTIONS_SEARCH:
                    console.log(data);
                    break;

                default:
                    break;
            }
        }

        clearFeatures() {
            this.featureListWrapper.innerHTML = "";
        }

        set mode(mode) {
            switch (mode) {
                case Orel.SEARCH_MODE:
                    this.searchWrapper.style.display = 'block';
                    this.dirWrapper.style.display = 'none';
                    this._mode = Orel.SEARCH_MODE;
                    break;

                case Orel.DIRECTIONS_MODE:
                    this.searchWrapper.style.display = 'none';
                    this.dirWrapper.style.display = 'block';
                    this._mode = Orel.DIRECTIONS_MODE;
                    break;

                case Orel.SEARCH_DISABLED:
                    this.searchWrapper.style.display = 'none';
                    this.dirWrapper.style.display = 'none';
                    this._mode = Orel.SEARCH_DISABLED;
                    break;
            }
        }

        get mode() {
            return this._mode;
        }
    };

    Orel.Map = class {
        /**
         * Map class that operates the map
         * @param {Object} htmlHandler
         * @param {Object} options
         * @param {Object|String} [options.source]
         * @param {String} options.source.raster: url pattern for the tile source
         * @param {String} options.source.vector: url to style json
         * @returns {Map}
         * @constructor
         */
        constructor(htmlHandler, options) {
            verbose && console.log('Initializing Map');

            this.html = htmlHandler;
            this.options = options;
            this.bbox = null;
            this.last_clicked = Date.now();
            this.click_event_timeout = null;
            this.dblclick_delay = 200;

            Object.getOwnPropertyNames(this).forEach(
                function (property) {
                    if (property[0] !== '_') return;
                    Object.defineProperty(Orel.Map.prototype, property.substring(1), {
                        get: function () {
                            return this[property];
                        }
                    });
                });
            let object = {
                _h: 0,
                _w: 0,
                _clicked: 0,
                _points: [],
                _bbox: []
            };
            Object.assign(this, object);

            this.init();
        }

        init() {
            switch (this._type) {
                case Orel.Map.VECTOR:
                    Orel.loadlib(this.library.mapboxgl, () => {
                        this.initMapboxGL();
                    });
                    break;

                case Orel.Map.RASTER:
                    Orel.loadlib(this.library.leaflet, () => {
                        // TODO add layer of compatability
                        IML = L;
                        IML.LngLatBounds = L.LatLngBounds;

                        IML.Map.prototype.highlight = function () {
                            console.log(this);
                        };

                        IML.Map.prototype.clearLayer = function () {

                        };


                        Orel.loadlib(this.library.leaflet_extra, () => {
                            IML.favorDoubleClick.enable();

                            this.mapObject = IML.map(this.html.mapWrapper, {
                                minZoom: this._zoomBnd[0] + 1,
                                maxZoom: this._zoomBnd[1] - 3,
                                maxBounds: this._extent
                            }).setView(this._center, this._zoom + 1);

                            L.tileLayer(this._source.raster, {
                                id: 'project.id',
                                tileSize: 256
                            }).addTo(this.mapObject);

                            this.addCommonEventListeners();
                        });

                    });
                    break;

                default:
                    throw new Error('If you are seeing this error, please, contact the developer');
            }
        }

        addCommonEventListeners() {
            this.mapObject.on('moveend', function () {
                // TODO update url state
            });
        }

        initMapboxGL() {

            IML = mapboxgl;

            IML.Map.prototype.highlight = function (object, type) {
                switch (type) {
                    case Orel.Map.FEATURE:
                        this.once('render', () => {
                            let int = setInterval(() => {
                                if (this.loaded()) {
                                    clearInterval(int);
                                    try {
                                        let features = this.queryRenderedFeatures({
                                            filter: ["==", "$id", object.id]
                                        });

                                        let data = features.length ? features[0] : object;
                                        let paint, layout;
                                        paint = Object.assign({}, data.layer.paint, {
                                            "text-color": "#149662",
                                            "text-halo-width": 2
                                        });
                                        layout = Object.assign({}, data.layer.layout, {"text-field": "{name_en}"});
                                        this.getSource("Point").setData(data);
                                        this.addLayer({
                                            "id": "Point",
                                            "source": "Point",
                                            "type": "symbol",
                                            "layout": layout,
                                            "paint": paint
                                        });
                                    } catch (e) {
                                        console.error(e);
                                        try {
                                            this.clearLayer("Point");
                                        } catch (e) {
                                        }
                                    }
                                }
                            }, 20);

                        });
                        this.flyTo({
                            center: object.geometry.coordinates,
                            zoom: Math.max(12, this.getZoom())
                        });
                        break;

                    case Orel.Map.POINT:
                        let el = document.createElement('div');
                        el.className = "orel-marker";

                        object.marker = new IML.Marker(el, {
                            offset: [-7.5, -7.5]
                        }).setLngLat(object.coords).addTo(this);

                        this._container.appendChild(el);
                        break;
                }
            };

            IML.Map.prototype.clearLayer = function (layer) {
                try {
                    this.removeLayer(layer);
                } catch (e) {
                }
            };
            console.log(this);

            this.mapObject = new IML.Map({
                container: this.html.mapWrapper,
                style: this.style,
                center: this._center,
                zoom: this._zoom,
                minZoom: this._zoomBnd[0],
                maxZoom: this._zoomBnd[1],
                doubleClickZoom: true
            });

            this.mapObject.getCanvas().style.cursor = this.cursor;

            this.mapObject.on('load', () => {

                this.mapObject.addSource("Point", Orel.Map.EmptyFeature);

                this.mapObject.addSource("PointGroup", Orel.Map.EmptyFeatureCollection);

                this.mapObject.addSource("Route", Orel.Map.EmptyFeatureCollection);

                this.mapObject.addControl(new IML.NavigationControl());

                addEventListeners: {

                    if (window.mapboxgl) {
                        this.mapObject.on('click', (e) => {
                            if (Date.now() - this.last_clicked < this.dblclick_delay) {
                                clearTimeout(this.click_event_timeout);
                                return;
                            }

                            this.last_clicked = Date.now();
                            let features = this.mapObject.queryRenderedFeatures(e.point, {
                                filter: ["==", "$type", "Point"]
                            });

                            if (features.length && features[0].layer.source !== "mapbox")
                                return;

                            if (features.length && this.hasOwnProperty("point") && this.point.hasOwnProperty("_feature") &&
                                this.point._feature.properties.name === features[0].properties.name)
                                return;

                            this.click_event_timeout = setTimeout(() => {
                                if (this.point && !features.length)
                                    return this.clear(Orel.Map.POINT);

                                if (features.length)
                                    return this.add(features[0], Orel.Map.FEATURE);

                                this.add(e, Orel.Map.POINT);
                            }, this.dblclick_delay);

                        });

                        this.mapObject.on('mousemove', (e) => {
                            let features = this.mapObject.queryRenderedFeatures(e.point, {
                                filter: ["==", "$type", "Point"]
                            });
                            this.mapObject.getCanvas().style.cursor = features.length ? this["cursor:hover"] : this.cursor;
                        });
                    }
                }

                this.addCommonEventListeners();
            });
        }

        /**
         * addPoint adds a point to the map
         * @param {Object} data
         * @param {String} type
         * @param {Boolean} solo
         */
        add(data, type, solo = true) {
            switch (type) {
                case Orel.Map.FEATURE:
                    solo && this.clear(Orel.Map.POINT);
                    this.html.clearFeatures();
                    this.point = new Orel.Point(data, this.mapObject);

                    Orel.search({
                        name: data.properties.name_en,
                        center: this.point.coords
                    }, Orel.SEARCH_NAME, (data) => {
                        this.html.displaySearchResults({
                            data: data,
                            point: this.point
                        }, Orel.HTMLHandler.FEATURE_SEARCH);
                        let event = new CustomEvent('point_added', {
                            'detail': {
                                point: this.point,
                                data: data
                            }
                        });
                        this.html.mapWrapper.dispatchEvent(event);
                    });

                    break;

                case Orel.Map.POINT:
                    solo && this.clear(Orel.Map.POINT);
                    this.html.clearFeatures();
                    this.point = new Orel.Point(data, this.mapObject);

                    Orel.search(this.point, Orel.SEARCH_LOCATION, (data) => {
                        this.html.displaySearchResults({
                            data: data,
                            point: this.point
                        }, Orel.HTMLHandler.POINT_SEARCH, this.point);
                        let event = new CustomEvent('point_added', {
                            'detail': {
                                point: this.point,
                                data: data
                            }
                        });
                        this.html.mapWrapper.dispatchEvent(event);
                    });

                    break;

                default:
                    break;
            }
            return this;
        }

        clear(type) {
            switch (type) {
                case Orel.Map.POINT:
                    this.point && this.point.remove();
                    this.point && delete this.point;
                    break;

                case Orel.Map.POINT_GROUP:
                    this.pointGroup && this.pointGroup.remove();
                    this.pointGroup && delete this.pointGroup;
                    break;

                case Orel.Map.ROUTE:
                    this.route && this.route.remove();
                    this.route && delete this.route;
                    break;

                case Orel.Map.ALL:
                    this.clear(Orel.Map.POINT);
                    this.clear(Orel.Map.POINT_GROUP);
                    this.clear(Orel.Map.ROUTE);
                    break;
            }
        }

        set source(source) {
            if (typeof source !== 'object' && typeof source !== "string")
                throw Error("source must be an object or a string");

            let defaults = {
                raster: "http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                vector: "mapbox://styles/mapbox/bright-v9"
            };

            source = source || {};
            source = typeof source === "string" ? {raster: source} : source;

            this._source = {
                raster: source.raster || defaults.raster,
                vector: source.vector || defaults.vector
            };

            return this._source;
        }

        set extent(extent) {
            if (!extent instanceof Array)
                throw Error('osmUrl must be a 1 x 4 Array\n' +
                    'e.g. [south, east, north, west]');

            this._extent = extent;
            return this._extent;
        }

        set bbox(bbox) {
            // TODO check variable validity
            // bbox [west, north, east, south]
            if (bbox && this.mapObject)
            // In case if bbox is invalid
                try {
                    this.mapObject.fitBounds(bbox);
                } catch (e) {
                }


            this._bbox = bbox;
            return this._bbox;
        }

        set zoom(zoom) {
            if (!(zoom = parseInt(zoom)))
                throw Error('zoom must be a 1 x 2 Array\n' +
                    'e.g. [maxZoom, minZoom]');

            this._zoom = zoom;
            if (this.mapObject)
                this.mapObject.setView(this._center, this._zoom)
            return this._zoom;
        }

        set zoomBnd(zoomBnd) {
            if (!zoomBnd instanceof Array)
                throw Error('zoom must be a 1 x 2 Array\n' +
                    'e.g. [maxZoom, minZoom]');

            this._zoomBnd = zoomBnd;
            return this._zoomBnd;
        }

        set options(options) {
            for (let property in options)
                this[property] = options[property];
            return this;
        }

        set center(params) {
            // Checking variable types
            {
                // Array may come from the url, so it should go to defaults if invalid
                if (params instanceof Array && (params.length !== 3
                    || (isNaN(params[0]) || isNaN(params[1]) || isNaN(params[2])))) {

                    console.error('First argument must be an 1 x 3 Array\n' +
                        'e.g. [{Double} lat, {Double} lng, {Integer} zoom]');
                    params = {};
                }
            }

            if (params instanceof Array)
                params = {
                    lat: parseFloat(params[0]),
                    lng: parseFloat(params[1])
                };

            let defaults = this.hasOwnProperty("mapObect") ? this.mapObject.getCenter() : {lng: 0, lat: 0};

            params = Object.assign({}, defaults, params);
            this._center = params;

            if (!params.hasOwnProperty("static") && this.hasOwnProperty("mapObject"))
                this.mapObject.moveTo(this._center);

            return this._center;
        }

        set view(view) {
            console.log(view);

            view.center = view.center || {};
            view.center.static = true;
            this.center = view.center;

            this.mapObject.flyTo(this._center, view.zoom);
        }
    };

    Orel.Node = class {
        /**
         * Node operated all points on the map
         * @param object
         */
        constructor(object) {

            //Assigning default values
            this.coords = object;
        }

        get coords() {
            return this._coords;
        }

        set coords(object = null) {
            /**
             * Checking argument types
             */
            {
                if (typeof object !== 'object' && typeof object !== 'string')
                    throw new Error('First argument must be an object or a string');
            }

            if (typeof object === 'string')
                object = JSON.parse(object);

            if (object instanceof Array)
                object = {
                    lng: object[0],
                    lat: object[1]
                };

            let defaults = {
                lng: 0,
                lat: 0
            };

            object = Object.assign({}, defaults, object);


            this._coords = {
                lng: object.lng,
                lat: object.lat
            };
        }
    };

    Orel.Point = class extends Orel.Node {
        /**
         * Point operates all OSM points
         * @param {GeoJSON} data
         * @param {mapboxgl.Map|L.Map} parent
         * @param [options]
         */
        constructor(data, parent, options) {
            super();

            this.parent = parent;
            this.options = options;
            console.log(data);

            if (data.type === 'Feature') {
                this.coords = data.geometry.coordinates;
                this._feature = data;
                this.parent.highlight(data, Orel.Map.FEATURE);
            } else {
                this.coords = data.lngLat;
                this.parent.highlight(this, Orel.Map.POINT);
            }

        }

        remove() {
            try {
                this.parent.clearLayer("Point");
                if (this.hasOwnProperty("boxWrapper"))
                    this.boxWrapper.removeChild(this.box);
            } catch (e) {
            }


            if (this.hasOwnProperty("marker"))
                this.marker.remove();
        }
    };

    Orel.PointGroup = class {
        /**
         * PointGroup operates groups of Points
         * {L.map|mapboxgl.Map} mapObject
         */
        constructor(mapObject) {
            this.mapObject = mapObject;
            this.bounds = new IML.LngLatBounds();
            this.points = [];
        }

        clear() {
            for (let i in this.points)
                this.points[i].remove();
            this.points = [];
        }

        pushPoint(point) {
            // TODO check the point

            this.points.push(point);
            this.bounds.extend(point.coords);
        }

        get bbox() {
            // bbox [west, north, east, south]
            return [this.bounds.getWest(), this.bounds.getNorth(),
                this.bounds.getEast(), this.bounds.getSouth()]
        }

        get length() {
            return this.points.length;
        }
    };

    Orel.Route = class extends Orel.PointGroup {
        /**
         * Route is ordered PointGroup,
         * which serves to display routes ont he map
         */
        constructor() {
            super();
            this.nodes = [];
            this.first = null;
            this.last = null;
        }

        /**
         *Adds a Point to the Route
         @param {Point} node: point to be added
         @param {Number} ref: reference element id
         @param {Boolean} left: add before element, default - false
         @param {Number} existing: elements id if it is in the list already
         */
        addPoint(node, ref, left, existing) {

            if (node instanceof Point) {

                let i;

                if (isNaN(existing)) {
                    i = this.nodes.length;
                    this.nodes.push(node);
                } else
                    i = existing;

                if (this.nodes.length === 1) {

                    this.first = i;
                    this.last = i;

                    return 1;
                }

                left = left || 0;
                ref = ref || last;

                if (ref === last && !left) {
                    this.nodes[ref].next = i;
                    this.nodes[i].prev = ref;
                    this.last = i;
                } else if (ref === first && left) {
                    this.nodes[ref].prev = i;
                    this.nodes[i].next = ref;
                    this.first = i;
                } else if (!left) {
                    this.nodes[i].next = this.nodes[ref].next;
                    this.nodes[i].prev = ref;
                    this.nodes[this.nodes[ref].next].prev = i;
                    this.nodes[ref].next = i;
                } else {
                    this.nodes[i].next = ref;
                    this.nodes[i].prev = this.nodes[ref].prev;
                    this.nodes[this.nodes[ref].prev].next = i;
                    this.nodes[ref].prev = i;
                }

                let path, placeFrom = node.coords(),
                    placeTo = node.coords();
                placeFrom = [placeFrom.lat, placeFrom.lng];
                placeTo = [placeTo.lat, placeTo.lng];

            }
        }

        /**
         *Deletes element from the Route
         @param {Number} ref: reference element id
         @param {Boolean} keep: keep in memory, default - false
         */
        deletePoint(ref, keep) {

            if (ref !== this.first & ref !== this.last) {
                this.nodes[this.nodes[ref].prev].next = this.nodes[ref].next;
                this.nodes[this.nodes[ref].next].prev = this.nodes[ref].prev;
            }

            if (ref === this.first) {
                let first = this.nodes[ref].next;
                this.nodes[this.nodes[ref].next].prev = null;
            }

            if (ref === this.last) {
                let last = nodes[ref].prev;
                this.nodes[this.nodes[ref].prev].next = null;
            }

            this.nodes[ref] = (keep) ? this.nodes[ref] : null;

            //TODO draw polyline excluding the one
        }

        /**
         *Adds a Point to the Route
         @param {Number} ref: element id
         @param {Number} to: reference element id
         @param {Boolean} left: add before element, default - false
         */
        movePoint(ref, to, left) {

            this.deletePoint(ref, 1);
            this.addPoint(this.nodes[ref], to, left, ref);

        }
    };


    Orel.Feature = class {
        /**
         * Unified Feature type for rendered and source Features
         * @param {Object|Orel.Point} data: geoJSON-like "Feature" object
         * @param {Orel.Map} parent
         * @param {Boolean} [rendered = false]
         */
        constructor(data, parent, rendered = false) {
            if (data instanceof Orel.Point)
                Orel.search(data, (data) => {
                    this.data = data;
                    this.rendered = false;
                });

            this.parent = parent;
            this.rendered = rendered;
            this.data = data;
        }

        update() {

        }

        get html() {

        }

        get json() {

        }

        get rendered() {

        }

        get data() {
            return this._data;
        }

        set data(data) {
            // TODO process data
            this._data = data;
        }

    };

    /**
     * Unified FeatureCollection type for rendered and source FeatureCollections
     * @param {Object|Array} data: geoJSON-like "FeatureCollection" object or
     *                             array of geoJSON-like "Feature" objects
     */
    Orel.FeatureCollection = class {
        constructor(data = null) {
            this.data = data;
        }

        add() {

        }

        get data() {
            return this._data;
        }

        set data(data) {
            // TODO process data
            this._data = data;
        }
    };

    // Defining types to add to map
    Orel.Map.FEATURE = Symbol();
    Orel.Map.ROUTE = Symbol();
    Orel.Map.POINT = Symbol();
    Orel.Map.POINT_GROUP = Symbol();
    Orel.Map.ALL = Symbol();

    Orel.Map.RASTER = Symbol();
    Orel.Map.VECTOR = Symbol();

    // Defining search methods
    Orel.SEARCH_LOCATION = Symbol();
    Orel.SEARCH_NAME = Symbol();
    Orel.INSTANT_SEARCH = Symbol();

    // Defining page modes
    Orel.SEARCH_MODE = Symbol();
    Orel.DIRECTIONS_MODE = Symbol();
    Orel.SEARCH_DISABLED = Symbol();

    // Defining search result display methods
    Orel.HTMLHandler.RESULT_LIST = Symbol();
    Orel.HTMLHandler.POINT_SEARCH = Symbol();
    Orel.HTMLHandler.FEATURE_SEARCH = Symbol();
    Orel.HTMLHandler.DIRECTIONS_SEARCH = Symbol();

    // Defining defaults
    Orel.Map.EmptyFeature = {
        "type": "geojson",
        "data": {
            "type": "Feature",
            "properties": {},
            "geometry": null
        }
    };
    Orel.Map.EmptyFeatureCollection = {
        "type": "geojson",
        "data": {
            "type": "FeatureCollection",
            "features": []
        }
    };


    window.Orel = Orel;
}());
