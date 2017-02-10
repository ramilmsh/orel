var Base = require('../Base.js'),
  View = require('./views');

function Home() {
  var self = this,
    handler = express(),
    view = new View();
  self.path = '/';

  handler.set('views', path.join(__dirname, 'views/templates'));

  handler.get('/', view.render);

  self.handler = handler;
  return self;
}

Home.prototype = new Base();

module.exports = new Home();
