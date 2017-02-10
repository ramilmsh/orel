var Base = require(path.join(__homedir, 'views/Base.js'));

function View() {
  var self = this;

  self.render = function (req, res) {
    res.render('index');
  }

  return self;
}

View.prototype = new Base();

module.exports = View;
