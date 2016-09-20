import Ember from 'ember';

export default Ember.Route.extend({
    model: function() {
        return this.store.createRecord('contact');
    },
    setupController(controller, model) {
      this._super(controller, model);
    },
    willTransition() {
      let model = this.controller.get('model');

      if (model.get('isNew')) {
        model.destroyRecord();
      }
    }
});
