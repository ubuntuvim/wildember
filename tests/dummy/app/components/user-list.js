//
import Ember from 'ember';

export default Ember.Component.extend({

    startAt: null,
    list: Ember.computed('startAt', function() {
        let store = this.get("store");
        //设置分页标记
        store.set('typeMaps.metadata', { 'isPagination':true } );
        return store.query('user', {
            startAt: store.get('startAtId'), //this.get("startAt"),
            orderByChild: 'createDate',
            limitToFirst: 5  //每页显示的条数
        });
    }),
    actions: {
        nextPage() {
            // 设置下一页开始的位置
            // let lastEleId = this.get("store").get('startAtId');
            this.set('startAt', this.get("store").get('startAtId'));
        }
    }

});
