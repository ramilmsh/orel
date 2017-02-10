var Base = require('../Base.js'),
    View = require('./views');

function Maps() {
    var self = this,
        handler = express(),
        view = new View();
    self.path = '/maps';

    handler.set('views', path.join(__dirname, 'views/public'));
    handler.use(express.static(path.join(__dirname, 'views/public')));

    handler.get('/', view.render);
    handler.get('/reverse/@:lng([-]?[0-9]+[.]?[0-9]*),:lat([-]?[0-9]+[.]?[0-9]*)', view.reverse);
    handler.get('/search/:query(*)?', view.search);
    handler.get('/dir', view.dir);

    self.handler = handler;
    return self;
}

Maps.prototype = new Base();

module.exports = new Maps();
