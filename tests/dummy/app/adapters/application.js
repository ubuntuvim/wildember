import DS from 'ember-data';
import WildemberAdapter from 'wild-ember/adapters/wildember';

export default WildemberAdapter.extend({
    wilddogConfig: {
        syncDomain: "ddlisting.wilddog.com",
        syncURL: "https://ddlisting.wilddogio.com" //输入节点 URL
    }
});
