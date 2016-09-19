// * 用户模型类 app/models/user.js
import Model from 'ember-data/model';
import DS from 'ember-data';

export default Model.extend({
    // userId: DS.attr('string'),  //不需要，直接使用id即可
    nickname: DS.attr('string'),
    email: DS.attr('string'),
    password: DS.attr('string'),
    createDate: DS.attr('number'),
    status: DS.attr('number'),  //1-正常；0-删除
    userProfile: DS.attr('string'),  //用户头像
    notebooks: DS.hasMany('notebook')  //笔记本
});
