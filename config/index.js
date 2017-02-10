/**
 * Initializes configuration. If no name passed, scans 'config/' directory
 * and returns all the configurations there.
 * NOTE: the policy in this project to request a library once, including config.
 * @param {String} [name]
 * @returns {*}
 */
function Config(config_name) {
    "use strict";

    var load = function (filename) {

        var data = fs.readFileSync(path.join('config', filename));

        data = JSON.parse(data);
        return data;

    },
        config = {};

    if (config_name)
        return load(config_name + '.json');

    var list = fs.readdirSync('config');
    for (var i = 0; i < list.length; ++i) {
        if (list[i].split('.').slice(-1)[0] === 'json') {
            var data = load(list[i]);
            config[data.name] = data;
        }
    }

    return config;
}

module.exports = Config;