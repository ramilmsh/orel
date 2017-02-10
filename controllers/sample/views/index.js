var Base = require(path.join(__homedir, 'views/Base.js'));

function View() {
  var self = this;

  //render method for the '/' path
  self.render = function (req, res) {
    res.end('sample');
  }

  return self;
}

View.prototype = new Base();

module.exports = View;
