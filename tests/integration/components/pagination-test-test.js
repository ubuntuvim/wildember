/* jshint expr:true */
import { expect } from 'chai';
import {
  describeComponent,
  it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
  'pagination-test',
  'Integration: PaginationTestComponent',
  {
    integration: true
  },
  function() {
    it('renders', function() {
      // Set any properties with this.set('myProperty', 'value');
      // Handle any actions with this.on('myAction', function(val) { ... });
      // Template block usage:
      // this.render(hbs`
      //   {{#pagination-test}}
      //     template content
      //   {{/pagination-test}}
      // `);

      this.render(hbs`{{pagination-test}}`);
      expect(this.$()).to.have.length(1);
    });
  }
);
