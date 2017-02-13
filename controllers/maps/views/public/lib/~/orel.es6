/* jshint esversion:6 */

(function (window, document, console) {

    class Interface {

        constructor() {
        }

        toString() {
            throw new NotImplementedException();
        }
    }

    class Exception extends Interface {

        constructor() {
        }
    }

    class NotImplementedException extends Exception {
        constructor() {
        }
    }

    class Importer extends Interface {
        constructor() {
            this.support = {};
        }

        static supported() {
        }

        static import(lib) {
            if (typeof lib === "string")
                Importer.importLibrary(lib);
            else if (lib instanceof Array)
                Importer.importAll(lib);
        }

        static importLibrary() {
        }

        static importAll(list) {
            for (let library in list)
                Importer.importLibrary(library);
        }
    }

    class Orel extends Interface {

        constructor() {
        }

        getMap() {
            if (Importer.supported("webgl"))
                Importer.import("mapboxgl");
            else
                Importer.import(["leaflet"]);
        }
    }

})(window, document, console);
