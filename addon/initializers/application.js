import Ember from 'ember';
import DS from 'ember-data';
// import firebase from 'firebase';
import WildemberAdapter from '../adapters/wildember';
import WildemberSerializer from '../serializers/wildember';
import forEach from 'lodash/collection/forEach';

export function initialize(application) {

    // Monkeypatch the store until ED gives us a good way to listen to push events
    if (!DS.Store.prototype._emberfirePatched) {
      DS.Store.reopen({
        _emberfirePatched: true,

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
