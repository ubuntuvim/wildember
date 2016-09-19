import DS from 'ember-data';

export default DS.Model.extend({
    title: DS.attr('string'),
    createDate: DS.attr('date'),
    status: DS.attr('number'),  //1-正常；0-删除
    userId: DS.attr('string'),  //冗余一个字段，可能方便查询
    user: DS.belongsTo('user'),  //用户
    notes: DS.hasMany('notebook')  //笔记
});
