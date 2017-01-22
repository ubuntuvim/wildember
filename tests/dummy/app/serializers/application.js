// app/serializers/application.js

import JSONSerializer from 'ember-data/serializers/json';

/**
 * 子类重写normalizeResponse方法，实现野狗的分页
 * @type {[type]}
 */
export default JSONSerializer.extend({

      /**
       * 分页处理
       */
      normalizeResponse(store, primaryModelClass, payload, id, requestType) {
          //分页
          if (store.get('typeMaps')
              && typeof(store.get('typeMaps').metadata) !== 'undefined'
              && store.get('typeMaps').metadata.isPagination) {
              //   Ember.Logger.debug("JSONSerializer.normalizeResponse：分页处理。");
              // 获取最后一个元素的位置
              let len = payload.length-1;
              let lsId = payload[len].id;
              // 野狗分页设置：https://coding.net/u/wilddog/p/wilddog-gist-js/git/tree/master/src/pagination#user-content-yi-kao-shang--ye-de-zui-hou--tiao-ji-lu-huo-qu-xia--ye-shu-ju
              //记录下一页开始记录id
              store.set("startAtId", lsId);
              //删除最后一个元素;
              payload.pop();
          }
          return this._super(...arguments);
      }
})
