import DS from 'ember-data';
import WildemberAdapter from 'wild-ember/adapters/wildember';

export default WildemberAdapter.extend({
    wilddogConfig: {
        syncDomain: "wildember.wilddog.com",
        syncURL: "https://wildember.wilddogio.com" //输入节点 URL
    }
});
