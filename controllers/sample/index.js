var Base = require('../Base.js'),
    View = require('./views');

function Sample() {
    var self = this,
        handler = express(),
        view = new View();
    self.path = '/sample';

    handler.set('views', path.join(__dirname, 'views/public'));

    self.handler = handler;
    return self;
}

Sample.prototype = new Base();

module.exports = new Sample();
