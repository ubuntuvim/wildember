import Ember from 'ember';
import DS from 'ember-data';
import Waitable from '../mixins/waitable';
import toPromise from '../utils/to-promise';
import forEach from 'lodash/collection/forEach';
import filter from 'lodash/collection/filter';
import map from 'lodash/collection/map';
import includes from 'lodash/collection/includes';
import indexOf from 'lodash/array/indexOf';
import find from 'lodash/collection/find';

var Promise = Ember.RSVP.Promise;

var uniq = function (arr) {
  var ret = Ember.A();

  arr.forEach(function(k) {
    if (indexOf(ret, k) < 0) {
      ret.push(k);
    }
  });

  return ret;
};


/**
 * wildember，这是一个连接野狗实时服务的适配器，开发者只需要继承类`WildemberAdapter`,
 * 并在适配器中设置对象`wilddogConfig`，此对象是用于连接野狗的URL。比如下面的代码
 *
 * ```js
 * export default WildemberAdapter.extend({
 *     wilddogConfig: {
 *          //  注意appId是注册野狗后自己的项目的项目名,
 *          //  可以在：https://www.wilddog.com/dashboard/查看
 *          syncDomain: "appId.wilddog.com",
 *          syncURL: "https://appId.wilddogio.com"
 *     }
 *  });
 * ```
 * 适配器会自动连接野狗实时服务，并且在适当时候（执行save、update操作）持久化数据；
 * 另一方面，适配器还会实时监测野狗数据库数据的变化，并且实时更新Ember.js项目中关联的属性值。
 */
export default DS.Adapter.extend(Waitable, {
  //
  defaultSerializer: '-wildember',
  // 连接野狗配置信息
  wilddogConfig: null,


  /**
   * 初始化，并获取野狗的连接
   */
  init(/*application*/) {
    this._super.apply(this, arguments);
    // wilddogConfig会在子类中被赋值
    let wilddogConfig = this.get('wilddogConfig');
    if (!wilddogConfig) {
        throw new Error('请在适配器`application`中设置属性`wilddogConfig`！');
    }
    // var ref = this.get('wildember').getWilddogRef(application);
    // 获取野狗连接
    wilddog.initializeApp(wilddogConfig);
    let ref = wilddog.sync().ref();
    if (!ref) {
      throw new Error('连接wilddog失败。');
    }
    // If provided wilddog reference was a query (eg: limits), make it a ref.
    this._ref = ref;

    // Keep track of what types `.findAll()` has been called for
    this._findAllMapForType = {};
    // Keep a cache to check modified relationships against
    this._recordCacheForType = {};
    // Used to batch records into the store
    this._queue = [];
  },


  /**
   * 调用push()方法得到一个按时间排序的唯一ID，ID格式：-KSbIkOwC91KABpN1pbi
   * push: https://docs.wilddog.com/api/sync/web/api.html#push
   * @return {String} 唯一id值
   */
  generateIdForRecord() {
    return this._getKey(this._ref.push());
  },


  /**
   * Use the Wilddog DataSnapshot's key as the record id
   *
   * @param {Object} snapshot - A Wilddog snapshot
   * @param {Object} payload - The payload that will be pushed into the store
   * @return {Object} payload
   */
  _assignIdToPayload(snapshot) {
    var payload = snapshot.val();
    if (payload !== null && typeof payload === 'object' && typeof payload.id === 'undefined') {
      payload.id = this._getKey(snapshot);
    }
    return payload;
  },


  /**
   * store调用此方法时候回根据id查询`typeClass`的数据。
   * 此方法返回的是一个promises，当promises执行成功的时候可以wilddog获取到数据。
   *
   * 此外，当wilddog后端数据库的数据有变化时候此方法会自动更新（ember项目的属性自动更新）
   */
  findRecord(store, typeClass, id) {
    var ref = this._getCollectionRef(typeClass, id);

    var log = `DS: WildemberAdapter#findRecord ${typeClass.modelName} to ${ref.toString()}`;

    return this._fetch(ref, log).then((snapshot) => {
      // 得到从wilddog返回的数据
      var payload = this._assignIdToPayload(snapshot);
      //缓存一下得到的数据
      this._updateRecordCacheForType(typeClass, payload, store);
      if (payload === null) {
        var error = new Error(`no record was found at ${ref.toString()}`);
            error.recordId = id;
        throw error;
      }

      return payload;
    });
  },


  /**
   * 获取数据并返回promises
   *
   * @param  {Wilddog} ref
   * @param  {String} log
   * @return {Promise<DataSnapshot>}
   * @private
   */
  _fetch(ref, log) {
    this._incrementWaiters();
    return new Promise((resolve, reject) => {

      ref.once('value', (snapshot) => {
        this._decrementWaiters();
        Ember.run(null, resolve, snapshot);

      }, (err) => {
        this._decrementWaiters();
        Ember.run(null, reject, err);
      });

    }, log);
  },

  recordWasPushed(store, modelName, record) {
    if (!record.__listening) {
      var typeClass = store.modelFor(modelName);
      this.listenForChanges(store, typeClass, record);
    }
  },


  recordWillUnload(store, record) {
    if (record.__listening) {
      this.stopListening(store, record.constructor, record);
    }
  },


  recordWillDelete(store, record) {
    record.eachRelationship((key, relationship) => {
      if (relationship.kind === 'belongsTo') {
        var parentRecord = record.get(relationship.key);
        var inverseKey = record.inverseFor(relationship.key);
        if (inverseKey && parentRecord.get('id')) {
          var parentRef = this._getCollectionRef(inverseKey.type, parentRecord.get('id'));
          this._removeHasManyRecord(store, parentRef, inverseKey.name, record.constructor, record.id);
        }
      }
    });
  },


  listenForChanges(store, typeClass, record) {
    // embedded records will get their changes from parent listeners
    if (!this.isRecordEmbedded(record)) {
      record.__listening = true;
      var ref = this._getCollectionRef(typeClass, record.id);
      var called = false;
      ref.on('value', (snapshot) => {
        if (called) {
          Ember.run(() => {
            this._handleChildValue(store, typeClass, snapshot);
          });
        }
        called = true;
      }, (error) => {
        Ember.Logger.error(error);
      });
    }
  },


  stopListening(store, typeClass, record) {
    if (record.__listening) {
      var ref = this._getCollectionRef(typeClass, record.id);
      ref.off('value');
      record.__listening = false;
    }
  },


  /**
   * 查询所有
   * 如果wilddog有数据的更新此方法会自动更新到应用
   */
  findAll(store, typeClass) {
    var ref = this._getCollectionRef(typeClass);

    var log = `DS: WildemberAdapter#findAll ${typeClass.modelName} to ${ref.toString()}`;

    return this._fetch(ref, log).then((snapshot) => {
      if (!this._findAllHasEventsForType(typeClass)) {
        this._findAllAddEventListeners(store, typeClass, ref);
      }
      var results = [];
      snapshot.forEach((childSnapshot) => {
        var payload = this._assignIdToPayload(childSnapshot);
        this._updateRecordCacheForType(typeClass, payload, store);
        results.push(payload);
      });

      return results;
    });
  },


  query(store, typeClass, query, recordArray) {
        var ref = this._getCollectionRef(typeClass);
        var modelName = typeClass.modelName;

        ref = this.applyQueryToRef(ref, query, store.get("typeMaps"));

        ref.on('child_added', Ember.run.bind(this, function (snapshot) {
            var record = store.peekRecord(modelName, this._getKey(snapshot));

            if (!record || !record.__listening) {
                var payload = this._assignIdToPayload(snapshot);
                var normalizedData = store.normalize(typeClass.modelName, payload);
                this._updateRecordCacheForType(typeClass, payload, store);
                record = store.push(normalizedData);
            }

            if (record) {
                recordArray.get('content').addObject(record._internalModel);
            }
        }));

        // `child_changed` is already handled by the record's
        // value listener after a store.push. `child_moved` is
        // a much less common case because it relates to priority

        ref.on('child_removed', Ember.run.bind(this, function (snapshot) {
          var record = store.peekRecord(modelName, this._getKey(snapshot));
          if (record) {
            recordArray.get('content').removeObject(record._internalModel);
          }
        }));

        // clean up event handlers when the array is being destroyed
        // so that future wilddog events wont keep trying to use a
        // destroyed store/serializer
        recordArray.__firebaseCleanup = function () {
          ref.off('child_added');
          ref.off('child_removed');
        };

        var log = `DS: WildemberAdapter#query ${modelName} with ${query}`;
        // _fetch返回一个查询数据的promise
        return this._fetch(ref, log).then((snapshot) => {
          if (!this._findAllHasEventsForType(typeClass)) {
            this._findAllAddEventListeners(store, typeClass, ref);
          }
          var results = [];
          snapshot.forEach((childSnapshot) => {
            var payload = this._assignIdToPayload(childSnapshot);
            this._updateRecordCacheForType(typeClass, payload, store);

            // 剔除id为空的数据
            if (payload.id) {
                results.push(payload);
            }
            // results.push(payload);
          });
          return results;
        });
  },


  applyQueryToRef(ref, query, typeMaps) {
    // 默认排序
    if (!query.orderBy) {
      query.orderBy = '_key';
    }

    if (query.orderBy === '_key'){
      ref = ref.orderByKey();
    } else if (query.orderBy === '_value') {
      ref = ref.orderByValue();
    } else if (query.orderBy === '_priority') {
      ref = ref.orderByPriority();
    } else {
      ref = ref.orderByChild(query.orderBy);
    }

    ['limitToFirst', 'limitToLast', 'startAt', 'endAt', 'equalTo'].forEach(function (key) {
        // 非null
      if (query[key] || query[key] === '' || query[key] === false) {
          // 分页
          if (typeMaps && typeof(typeMaps.metadata) !== 'undefined' && typeMaps.metadata.isPagination) {
              Ember.Logger.debug("Adapter.applyQueryToRef：分页处理。");
              //查询数量加一，为何要这样做请看：https://coding.net/u/wilddog/p/wilddog-gist-js/git/tree/master/src/pagination#user-content-yi-kao-shang--ye-de-zui-hou--tiao-ji-lu-huo-qu-xia--ye-shu-ju
              if (key === 'limitToFirst') {
                  ref = ref.limitToFirst(parseInt(query[key])+1);
              } else if (key === 'limitToLast') {
                  ref = ref.limitToLast(parseInt(query[key])+1);
              } else {
                  ref = ref[key](query[key]);
              }
          } else {
              ref = ref[key](query[key]); // ref[startAt]('3')  --> ref.startAt('3')
          }
      }
    });

    return ref;
  },


  /**
   * Keep track of what types `.findAll()` has been called for
   * so duplicate listeners aren't added
   */
  _findAllMapForType: undefined,


  /**
   * Determine if the current type is already listening for children events
   */
  _findAllHasEventsForType(typeClass) {
    return !Ember.isNone(this._findAllMapForType[typeClass.modelName]);
  },


  /**
   * After `.findAll()` is called on a modelName, continue to listen for
   * `child_added`, `child_removed`, and `child_changed`
   */
  _findAllAddEventListeners(store, typeClass, ref) {
    var modelName = typeClass.modelName;
    this._findAllMapForType[modelName] = true;

    ref.on('child_added', Ember.run.bind(this, function (snapshot) {
      if (!store.hasRecordForId(modelName, this._getKey(snapshot))) {
        this._handleChildValue(store, typeClass, snapshot);
      }
    }));
  },


  /**
   * Push a new child record into the store
   */
  _handleChildValue(store, typeClass, snapshot) {
    // No idea why we need this, we are already turning off the callback by
    // calling ref.off in recordWillUnload. Something is fishy here
    if (store.isDestroying) {
      return;
    }
    var value = snapshot.val();
    if (value === null) {
      var id = this._getKey(snapshot);
      var record = store.peekRecord(typeClass.modelName, id);
      // TODO: refactor using ED
      if (!record.get('isDeleted')) {
        record.deleteRecord();
      }
    } else {
      var payload = this._assignIdToPayload(snapshot);

      this._enqueue(function WildemberAdapter$enqueueStorePush() {
        if (!store.isDestroying) {
          var normalizedData = store.normalize(typeClass.modelName, payload);
          store.push(normalizedData);
        }
      });
    }
  },


  /**
   * `createRecord` is an alias for `updateRecord` because calling \
   * `ref.set()` would wipe out any existing relationships
   */
  createRecord(store, typeClass, snapshot) {
    return this.updateRecord(store, typeClass, snapshot).then(() => {
      this.listenForChanges(store, typeClass, snapshot.record);
    });
  },


  /**
   * Called by the store when a record is created/updated via the `save`
   * method on a model record instance.
   *
   * The `updateRecord` method serializes the record and performs an `update()`
   * at the the Wilddog location and a `.set()` at any relationship locations
   * The method will return a promise which will be resolved when the data and
   * any relationships have been successfully saved to Wilddog.
   *
   * We take an optional record reference, in order for this method to be usable
   * for saving nested records as well.
   */
  updateRecord(store, typeClass, snapshot) {
    var recordRef = this._getAbsoluteRef(snapshot.record);
    var recordCache = this._getRecordCache(typeClass, snapshot.id);
    var pathPieces = recordRef.path.toString().split('/');
    var lastPiece = pathPieces[pathPieces.length-1];
    var serializedRecord = snapshot.serialize({
      includeId: (lastPiece !== snapshot.id) // record has no wilddog `key` in path
    });
    const serializer = store.serializerFor(typeClass.modelName);
    
    return new Promise((resolve, reject) => {
      var relationshipsToSave = [];
      // first we remove all relationships data from the serialized record, we backup the
      // removed data so that we can save it at a later stage.
      snapshot.record.eachRelationship((key, relationship) => {
          const relationshipKey = serializer.keyForRelationship(key);
          const data = serializedRecord[relationshipKey];
          const isEmbedded = this.isRelationshipEmbedded(store, typeClass.modelName, relationship);
          const hasMany = relationship.kind === 'hasMany';
          if (hasMany || isEmbedded) {
              if (!Ember.isNone(data)) {
                relationshipsToSave.push({
                  data:data,
                  relationship:relationship,
                  isEmbedded:isEmbedded,
                  hasMany:hasMany
                });
              }
              delete serializedRecord[relationshipKey];
          }
      });
      var reportError = (errors) => {
        var error = new Error(`Some errors were encountered while saving ${typeClass} ${snapshot.id}`);
        error.errors = errors;
        reject(error);
      };
      this._updateRecord(recordRef, serializedRecord).then(() => {
        // and now we construct the list of promise to save relationships.
        var savedRelationships = relationshipsToSave.map((relationshipToSave) => {
            const data = relationshipToSave.data;
            const relationship = relationshipToSave.relationship;
            if (relationshipToSave.hasMany) {
              return this._saveHasManyRelationship(store, typeClass, relationship, data, recordRef, recordCache);
            } else {
              // embedded belongsTo, we need to fill in the informations.
              if (relationshipToSave.isEmbedded) {
                return this._saveEmbeddedBelongsToRecord(store, typeClass, relationship, data, recordRef);
              }
            }
          }
        );
        return Ember.RSVP.allSettled(savedRelationships);
      }).catch((e) => {
        reportError([e]);
      }).then((results) => {
        var rejected = Ember.A(results).filterBy('state', 'rejected');
        if (rejected.length !== 0) {
          reportError(rejected.mapBy('reason').toArray());
        } else {
          resolve();
        }
      });
  }, `DS: WildemberAdapter#updateRecord ${typeClass} to ${recordRef.toString()}`);
  },


  /**
   * Update a single record without caring for the relationships
   * @param  {Wilddog} recordRef
   * @param  {Object} serializedRecord
   * @return {Promise}
   */
  _updateRecord(recordRef, serializedRecord) {
    return toPromise(recordRef.update, recordRef, [serializedRecord]);
  },


  /**
   * Call _saveHasManyRelationshipRecord on each record in the relationship
   * and then resolve once they have all settled
   */
  _saveHasManyRelationship(store, typeClass, relationship, ids, recordRef, recordCache) {
    if (!Ember.isArray(ids)) {
      throw new Error('hasMany relationships must must be an array');
    }
    var idsCache = Ember.A(recordCache[relationship.key]);
    var dirtyRecords = [];

    // Added
    var addedRecords = filter(ids, (id) => {
      return !idsCache.contains(id);
    });

    // Dirty
    dirtyRecords = filter(ids, (id) => {
      var relatedModelName = relationship.type;
      return store.hasRecordForId(relatedModelName, id) && store.peekRecord(relatedModelName, id).get('hasDirtyAttributes') === true;
    });

    dirtyRecords = map(uniq(dirtyRecords.concat(addedRecords)), (id) => {
      return this._saveHasManyRecord(store, typeClass, relationship, recordRef, id);
    });

    // Removed
    var removedRecords = filter(idsCache, (id) => {
      return !includes(ids, id);
    });

    removedRecords = map(removedRecords, (id) => {
      return this._removeHasManyRecord(store, recordRef, relationship.key, typeClass, id);
    });
    // Combine all the saved records
    var savedRecords = dirtyRecords.concat(removedRecords);
    // Wait for all the updates to finish
    return Ember.RSVP.allSettled(savedRecords).then((savedRecords) => {
      var rejected = Ember.A(Ember.A(savedRecords).filterBy('state', 'rejected'));
      if (rejected.get('length') === 0) {
        // Update the cache
        recordCache[relationship.key] = ids;
        return savedRecords;
      }
      else {
        var error = new Error(`Some errors were encountered while saving a hasMany relationship ${relationship.parentType} -> ${relationship.type}`);
            error.errors = Ember.A(rejected).mapBy('reason');
        throw error;
      }
    });
  },


  /**
   * If the relationship is `async: true`, create a child ref
   * named with the record id and set the value to true

   * If the relationship is `embedded: true`, create a child ref
   * named with the record id and update the value to the serialized
   * version of the record
   */
  _saveHasManyRecord(store, typeClass, relationship, parentRef, id) {
    const serializer = store.serializerFor(typeClass.modelName);
    var ref = this._getRelationshipRef(parentRef, serializer.keyForRelationship(relationship.key), id);
    var record = store.peekRecord(relationship.type, id);
    var isEmbedded = this.isRelationshipEmbedded(store, typeClass.modelName, relationship);
    if (isEmbedded) {
      return record.save();
    }

    return toPromise(ref.set, ref,  [true]);
  },


  /**
   * Determine from the serializer if the relationship is embedded via the
   * serializer's `attrs` hash.
   *
   * @return {Boolean}              Is the relationship embedded?
   */
  isRelationshipEmbedded(store, modelName, relationship) {
    // var serializer = store.serializerFor(modelName);
    // return serializer.hasDeserializeRecordsOption(relationship.key);
    return this.hasDeserializeRecordsOption(relationship.key);
  },

  // checks config for attrs option to deserialize records
  // a defined option object for a resource is treated the same as
  // `deserialize: 'records'`
  // 注意：从ember-data2.8版本开始没有这个方法！
  hasDeserializeRecordsOption(attr) {
    var alwaysEmbed = this.hasEmbeddedAlwaysOption(attr);
    var option = this.attrsOption(attr);
    return alwaysEmbed || (option && option.deserialize === 'records');
  },

  // checks config for attrs option to embedded (always) - serialize and deserialize
  hasEmbeddedAlwaysOption(attr) {
    var option = this.attrsOption(attr);
    return option && option.embedded === 'always';
  },

  attrsOption(attr) {
    var attrs = this.get('attrs');
    return attrs && (attrs[camelize(attr)] || attrs[attr]);
  },

  /**
   * Determine from if the record is embedded via implicit relationships.
   *
   * @return {Boolean}              Is the relationship embedded?
   */
  isRecordEmbedded(record) {
    if (record._internalModel) {
      record = record._internalModel;
    }

    var found = this.getFirstEmbeddingParent(record);

    return !!found;
  },


  /**
   * Remove a relationship
   */
  _removeHasManyRecord(store, parentRef, key, typeClass, id) {
    const relationshipKey = store.serializerFor(typeClass.modelName).keyForRelationship(key);
    var ref = this._getRelationshipRef(parentRef, relationshipKey, id);
    return toPromise(ref.remove, ref, [], ref.toString());
  },


  /**
   * Save an embedded belongsTo record and set its internal wilddog ref
   *
   * @return {Promise<DS.Model>}
   */
  _saveEmbeddedBelongsToRecord(store, typeClass, relationship, id, parentRef) {
    var record = store.peekRecord(relationship.type, id);
    if (record) {
      return record.save();
    }
    return Ember.RSVP.Promise.reject(new Error(`Unable to find record with id ${id} from embedded relationship: ${JSON.stringify(relationship)}`));
  },


  /**
   * Called by the store when a record is deleted.
   */
  deleteRecord(store, typeClass, snapshot) {
    var ref = this._getAbsoluteRef(snapshot.record);
    ref.off('value');
    return toPromise(ref.remove, ref);
  },


  /**
   * Determines a path fo a given type
   */
  pathForType(modelName) {
    var camelized = Ember.String.camelize(modelName);
    return Ember.String.pluralize(camelized);
  },


  /**
   * Return a Wilddog reference for a given modelName and optional ID.
   */
  _getCollectionRef(typeClass, id) {
    var ref = this._ref;
    if (typeClass) {
      ref = ref.child(this.pathForType(typeClass.modelName));
    }
    if (id) {
      ref = ref.child(id);
    }
    return ref;
  },


  /**
   * Returns a Wilddog reference for a record taking into account if the record is embedded
   *
   * @param  {DS.Model} record
   * @return {Wilddog}
   */
  _getAbsoluteRef(record) {
    if (record._internalModel) {
      record = record._internalModel;
    }

    var embeddingParent = this.getFirstEmbeddingParent(record);

    if (embeddingParent) {
      var { record: parent, relationship } = embeddingParent;
      const embeddedKey = parent.store.serializerFor(parent.modelName).keyForRelationship(relationship.key);
      var recordRef = this._getAbsoluteRef(parent).child(embeddedKey);

      if (relationship.kind === 'hasMany') {
        recordRef = recordRef.child(record.id);
      }
      return recordRef;
    }

    return this._getCollectionRef(record.type, record.id);
  },


  /**
   * Returns the parent record and relationship where any embedding is detected
   *
   * @param  {DS.InternalModel} internalModel
   * @return {Object}
   */
  getFirstEmbeddingParent(internalModel) {
    var embeddingParentRel = find(internalModel._implicitRelationships, (implicitRel) => {
      var members = implicitRel.members.toArray();
      var parent = members[0];

      if (!parent) {
        return false;
      }

      var parentRel = parent._relationships.get(implicitRel.inverseKey);
      return this.isRelationshipEmbedded(this.store, parent.type.modelName, parentRel.relationshipMeta);
    });

    if (embeddingParentRel) {
      var parent = embeddingParentRel.members.toArray()[0];
      var parentKey = embeddingParentRel.inverseKey;
      var parentRel = parent._relationships.get(parentKey).relationshipMeta;
      return { record: parent, relationship: parentRel };
    }
  },


  /**
   * Return a Wilddog reference based on a relationship key and record id
   */
  _getRelationshipRef(ref, key, id) {
    return ref.child(key).child(id);
  },


  /**
   * The amount of time (ms) before the _queue is flushed
   */
  _queueFlushDelay: (1000/60), // 60fps


  /**
   * Called after the first item is pushed into the _queue
   */
  _queueScheduleFlush() {
    Ember.run.later(this, this._queueFlush, this._queueFlushDelay);
  },


  /**
   * Call each function in the _queue and the reset the _queue
   */
  _queueFlush() {
    forEach(this._queue, function WildemberAdapter$flushQueueItem(queueItem) {
      var fn = queueItem[0];
      var args = queueItem[1];
      fn.apply(null, args);
    });
    this._queue.length = 0;
  },


  /**
   * Push a new function into the _queue and then schedule a
   * flush if the item is the first to be pushed
   */
  _enqueue(callback, args) {
    //Only do the queueing if we scheduled a delay
    if (this._queueFlushDelay) {
      var length = this._queue.push([callback, args]);
      if (length === 1) {
        this._queueScheduleFlush();
      }
    } else {
      callback.apply(null, args);
    }
  },


  /**
   * A cache of hasMany relationships that can be used to
   * diff against new relationships when a model is saved
   */
  _recordCacheForType: undefined,


  /**
   * _updateHasManyCacheForType
   */
  _updateRecordCacheForType(typeClass, payload, store) {
    if (!payload) { return; }
    var id = payload.id;
    var cache = this._getRecordCache(typeClass, id);
    const serializer = store.serializerFor(typeClass.modelName);
    // Only cache relationships for now
    typeClass.eachRelationship((key, relationship) => {
      if (relationship.kind === 'hasMany') {
        var ids = payload[serializer.keyForRelationship(key)];
        cache[key] = !Ember.isNone(ids) ? Ember.A(Object.keys(ids)) : Ember.A();
      }
    });
  },


  /**
   * 缓存record，如果record不在缓存中则创建一个新的缓存record
   */
  _getRecordCache(typeClass, id) {
    var modelName = typeClass.modelName;
    var cache = this._recordCacheForType;
    cache[modelName] = cache[modelName] || {};
    cache[modelName][id] = cache[modelName][id] || {};
    return cache[modelName][id];
  },


  /**
   * 获得当前路径下节点的名称。
   * key() :https://docs.wilddog.com/api/sync/web/api.html#key
   */
  _getKey(refOrSnapshot) {
    var key;
    if (typeof refOrSnapshot.key === 'function') {
      key = refOrSnapshot.key();
    } else if (typeof refOrSnapshot.key === 'string') {
      key = refOrSnapshot.key;
    } else {
      key = refOrSnapshot.name();
    }
    return key;
  },


  /**
   * We don't need background reloading, because wilddog!
   */
  shouldBackgroundReloadRecord() {
    return false;
  }
});
