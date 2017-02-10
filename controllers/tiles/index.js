var Base = require('../Base.js'),
    View = require('./views');

function Tiles() {
    var self = this,
        handler = express(),
        view = new View();
    self.path = '/tiles';

    handler.set('views', path.join(__dirname, 'views/public'));
    handler.use(express.static(path.join(__dirname, 'views/public')));

    handler.get('/:z(\\d+)/:x(\\d+)/:y(\\d+):scale(@[1234]x)?.:format([png|pbf|webp|jpeg]+)', view.tile);

    self.handler = handler;
    return self;
}

Tiles.prototype = new Base();

module.exports = new Tiles();
