'use strict';

var EOL         = require('os').EOL;
var chalk       = require('chalk');


module.exports = {
  normalizeEntityName: function() {
    // this prevents an error when the entityName is
    // not specified (since that doesn't actually matter
    // to us
  },

  availableOptions: [
    { name: 'url', type: String }
  ],

  afterInstall: function(options) {

    var bowerDeps = [
      {
        name: 'wildember',
        target: '^0.1.0'
      }
    ];

    return this.addBowerPackagesToProject(bowerDeps).then(function () {
      var g = chalk.green;
      var y = chalk.yellow;
      var b = chalk.blue;
      var m = chalk.magenta;
      var r = chalk.red;
      var out = EOL;

      out += y('wildember') + ' installed.' + EOL +
          EOL +
          r('CONFIGURATION REQUIRED') + EOL +
          EOL +
          '请参考：https://github.com/ubuntuvim/WildEmber进行配置使用，或者参考下面的配置。' +
          EOL + EOL;


      out += "配置示例:" + EOL +
          EOL +
          g("// app/adapters/application.js") + EOL +
          "" + EOL +
          "import DS from 'ember-data';" + EOL +
          "import WildemberAdapter from 'wild-ember/adapters/wildember';" + EOL +
          "" + EOL +
          "export default WildemberAdapter.extend({" + EOL +
          "    wilddogConfig: {" + EOL +
          "        syncDomain: 'wildember.wilddog.com'," + EOL +
          "        syncURL: 'https://wildember.wilddogio.com'" + EOL +
          "    }" + EOL +
          "});" + EOL +
          EOL;

      this.ui.writeLine(out);
    }.bind(this));
  }
};
