import Ember from 'ember';
import DS from 'ember-data';
// import firebase from 'firebase';
import WildemberAdapter from '../adapters/wildember';
import WildemberSerializer from '../serializers/wildember';
import forEach from 'lodash/collection/forEach';

export function initialize(/*application*/) {


    let application = arguments[1] || arguments[0];
    // 千万千万别忘记注册，否则在application中不起作用
    application.register('adapter:-wildember', WildemberAdapter);
    application.register('serializer:-wildember', WildemberSerializer);

  // Monkeypatch the store until ED gives us a good way to listen to push events
  if (!DS.Store.prototype._emberfirePatched) {
    DS.Store.reopen({
      _emberfirePatched: true,

      /**
       * 自动分页查询节点所有数据<br>
       * 由于一次性查询的数据量有限制，如果数据量大不能一次性把当前节点所有数据查询出来，
       * 只能通过分页方式查询。
       * 野狗数据限制说明：https://docs.wilddog.com/guide/sync/data-limit.html
       */
      findAllPagination(store, typeClass, startPosition) {
        var typeClassTmp = typeClass;
        var adapter = store.adapterFor(typeClass);
        // var ref = adapter._getCollectionRef(typeClass);
        var ref = adapter._ref;
        //转换model名，通常转为复数形式
        typeClass = adapter.pathForType(typeClass);
        // store.modelFor(typeClass);
        //查询当前model下的数据
        ref = ref.ref(typeClass);
        var COUNT = 100;
        var totalResults = [];
        var queryFlag = true;
        var query = {
            startAt: startPosition, //this.get("startAt"),
            orderByChild: 'timestamp',
            limitToFirst: COUNT //每页显示的条数
          }
          // store.set('typeMaps.metadata', { 'isPagination':true } );
        var typeMaps = {
          metadata: {
            isPagination: false
          }
        }
        ref = adapter.applyQueryToRef(ref, query, typeMaps);
        var log = `DS: WildemberAdapter#findAll ${typeClass} to ${ref}`;
        return adapter._fetch(ref, log).then((snapshot) => {
          var results = [];
          snapshot.forEach((childSnapshot) => {
            var payload = adapter._assignIdToPayload(childSnapshot);
            results.push(payload);
          });
          /*
              每次获取100条记录，取最后一条作为下一页的开始，然后再查询下一页的数据，
              只要下一页还有超过2条数据就继续分页查询，
              直至查询完当前节点的所有数据。
           */
          var len = results.length;
          if (len < COUNT) { //最有一页不足100条，不需要再继续分页查询
            return results;
          } else {
            //最后一个元素
            var startPosition = results[len - 1].id; //
            return this.findAllPagination(store, typeClass, startPosition).then((list) => {
                var len = results.length-1;  //  len - 1目的是为了让后一页的第一条数据覆盖掉前一页的最后一条数据
                // 把后面的数据拼接上去，
                list.forEach((item) => {
                    //后一页的第一个数据会覆盖到上一页的最后一个数据，完美解决了因为多获取一条数据导致重复的问题
                    //https://coding.net/u/wilddog/p/wilddog-gist-js/git/tree/master/src/pagination#user-content-yi-kao-shang--ye-de-zui-hou--tiao-ji-lu-huo-qu-xia--ye-shu-ju
                    results[len++]=item;
                });
                return results;
            });
          }
        }).catch(function(err) {
          console.error('operation is failed ', err);
        }); //_fetch
      },


      /**
       * 查询某个节点个数
       */
      count(store, typeClass) {
        return this.findAllPagination(store, typeClass).then((results) => {
            return results ? results.length : 0;
        });
      },

      push() {
        var result = this._super.apply(this, arguments);
        var records = result;

        if (!Ember.isArray(result)) {
          records = [result];
        }

        forEach(records, (record) => {
          var modelName = record.constructor.modelName;
          var adapter = this.adapterFor(modelName);
          if (adapter.recordWasPushed) {
            adapter.recordWasPushed(this, modelName, record);
          }
        });

        return result;
      },

      recordWillUnload(record) {
        var adapter = this.adapterFor(record.constructor.modelName);
        if (adapter.recordWillUnload) {
          adapter.recordWillUnload(this, record);
        }
      },

      recordWillDelete(record) {
        var adapter = this.adapterFor(record.constructor.modelName);
        if (adapter.recordWillDelete) {
          adapter.recordWillDelete(this, record);
        }
      }
    });
  }

  if (!DS.Model.prototype._emberfirePatched) {
    DS.Model.reopen({
      _emberfirePatched: true,

      unloadRecord() {
        this.store.recordWillUnload(this);
        return this._super();
      },

      deleteRecord() {
        this.store.recordWillDelete(this);
        this._super();
      },

      ref() {
        var adapter = this.store.adapterFor(this.constructor.modelName);
        if (adapter._getAbsoluteRef) {
          return adapter._getAbsoluteRef(this);
        }
      }
    });
  }

  if (!DS.AdapterPopulatedRecordArray.prototype._emberfirePatched) {
    DS.AdapterPopulatedRecordArray.reopen({
      _emberfirePatched: true,

      willDestroy() {
        if (this.__firebaseCleanup) {
          this.__firebaseCleanup();
        }
        return this._super();
      }
    });
  }

  DS.WildemberAdapter = WildemberAdapter;
  DS.WildemberSerializer = WildemberSerializer;

}

export default {
  name: 'application',
  before: 'ember-data',
  initialize
};
