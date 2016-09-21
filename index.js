/* jshint node: true */
'use strict';

module.exports = {
    name: 'wildember'

    // included: function included(app) {
    //   this._super.included(app);
    //
    //   // make sure app is correctly assigned when being used as a nested addon
    //   if (app.app) {
    //     app = app.app;
    //   }
    //   this.app = app;
    //
    //   this.app.import(app.bowerDirectory + '/wildember/wildember.js');
    //
    //   app.import('vendor/wildember/shim.js', {
    //     type: 'vendor',
    //     exports: { 'wildember': ['default'] }
    //   });
    // }
};
