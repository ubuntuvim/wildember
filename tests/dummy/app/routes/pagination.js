import Ember from 'ember';

export default Ember.Route.extend({
    model() {
        return Ember.RSVP.hash({
            todos: this.store.findAllPagination(this.store, 'todo-item'),
            // 查询数量
            count: this.store.count(this.store, 'todo-item')
        });
    }
});
