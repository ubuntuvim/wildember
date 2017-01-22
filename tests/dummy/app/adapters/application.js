import DS from 'ember-data';
import WildemberAdapter from 'wildember/adapters/wildember';

export default WildemberAdapter.extend({
    wilddogConfig: {
        syncDomain: "ddlisting3.wilddog.com",
        syncURL: "https://ddlisting3.wilddogio.com" //输入节点 URL
    }
});
