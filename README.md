# wildember简介

wildember是一个方便、快捷连接野狗实时服务适配器。

[wildemer](https://github.com/ubuntuvim/wildemer)是一个类似[Emberfire](https://github.com/firebase/emberfire)的适配器，
不同的是前者用于适配[野狗](https://www.wilddog.com/)实时服务，
后者用于适配[firebase](https://www.firebase.com/)实时服务。  


野狗和firebase都是实时的数据服务，但是遗憾的是firebase是谷歌的，你懂的在天朝想访问都是比较那个啥的！！！
所以找了国内一个类似的、服务也很棒的产品——野狗。野狗提供了丰富、人性化的API文档，以及强大的sdk，对于开发者来说是非常好的事情。
也正是因为firebase无法访问所以我们为Ember.js的开发者提供了连接野狗的适配器wildemer。它的使用方式和firebase一模一样，因为WildEmber是直接fork Emberfire的。即使上不了firebase我们也一样可以享受到非常棒的实时服务。

## 运行本项目

如果你想直接运行本项目可以clone代码到自己本地，然后执行`npm install`和`bower install`安装项目依赖，安装完毕后执行[http://localhost:4200]可以查看效果。

## 安装wildember

* 使用命令安装：`ember install wildember`。
* 修改`app/adapters/application.js`，如果没有自动创建这个文件请手动创建，或者使用命令`ember g adapter application`创建。
在文件内增加如下代码：

```js
import WildemberAdapter from 'wildember/adapters/wildember';

export default WildemberAdapter.extend({
    wilddogConfig: {
        syncDomain: "<appId>.wilddog.com",
        syncURL: "https://<appId>.wilddogio.com" //输入节点 URL
    }
});
```

代码中的`<appId>`是你在野狗创建的应用id。可以在[https://www.wilddog.com/dashboard/](https://www.wilddog.com/dashboard/)，如下图所示：

![appid](http://emberteach.ddlisting.com/content/images/2016/09/wilddog.png)

如果图片无法显示，请直接点击链接查看图片。[图片链接](http://emberteach.ddlisting.com/content/images/2016/09/wilddog.png)

红色圈中的部分就是你的应用appid。详细例子请参考：[library-app的adapters/application.js](https://github.com/ubuntuvim/wildember/blob/master/tests/dummy/app/adapters/application.js)

* 导入wilddog，请在你的ember应用的`app/index.html`文件中导入野狗的库文件。

```html
<script src = "https://cdn.wilddog.com/sdk/js/2.0.0/wilddog.js"></script>
```

详细例子请参考：[library-app的index.html](https://github.com/ubuntuvim/wildember/blob/master/tests/dummy/app/index.html)

* **配置野狗后台**

安装并配置完毕之后我们还需要在野狗的服务后台设置域名的白名单。

1. 进入你的应用管理后台，地址[https://www.wilddog.com/dashboard/](https://www.wilddog.com/dashboard/)。
2. 点击你的应用进入详细设置页面
3. 选择左侧是“安全”，然后输入的你的域名，请看下图所示位置，如果你不配置白名单访问的时候会提示你无权访问数据
4. 经过前面的设置还是提示无权访问还需要在“实时数据同步”中设置读写权限，在修改规则表达式为：

```
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

![设置白名单](http://emberteach.ddlisting.com/content/images/2016/09/wildember2.png)

如果图片无法显示，请直接点击链接查看图片。[图片链接2](http://emberteach.ddlisting.com/content/images/2016/09/wildember2.png)

配置完成之后请重启的你的APP。


## 使用wildember的完整示例。

[libaray-app](https://github.com/ubuntuvim/wildember/tree/master/tests/dummy)

或者请直接预览：[http://wildember.ddlisting.com/](http://wildember.ddlisting.com/)

## 分页设置

由于是实时数据服务，分页设置并不好处理，参考野狗官方给的[分页实例](https://coding.net/u/wilddog/p/wilddog-gist-js/git/tree/master/src/pagination#user-content-yi-kao-shang--ye-de-zui-hou--tiao-ji-lu-huo-qu-xia--ye-shu-ju)，再整合到wildember中。目前实现的分页还只能点击“下一页”实现，还不能直接实现输入页码、直接跳转到某一页功能，这个主要是受限于野狗提供API。**此分页非常适用于滚动式分页。**

### 如何分页

分页效果请看[http://localhost:4200/user](http://localhost:4200/user)、[http://localhost:4200/pagination](http://localhost:4200/pagination)，具体实现代码请看下面的例子（以其中的pagination为例子）：

#### 一、设置序列化器（JSONSerializer）

使用命令`ember g serialize application`创建一个处理数据的`JSONSerializer`，默认可能创建的可能是`JSONAPISerializer`，需要修改。
你可以直接复制下面的代码到你的JSONSerializer中。

```js
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
```

### 二、查询数据

查询数据与图片查询一直，唯一不同的是要在查询之前设置一个分页标识`isPagination`。请看下面组件类中查询数据的方法。

```js
// app/components/pagination-test.js
import Ember from 'ember';

export default Ember.Component.extend({

    startAt: null,
    list: Ember.computed('startAt', function() {
        let store = this.get("store");
        //设置分页标记
        store.set('typeMaps.metadata', { 'isPagination':true } );
        return store.query('todo-item', {
            startAt: store.get('startAtId'), //this.get("startAt"),
            orderByChild: 'timestamp',
            limitToFirst: 2  //每页显示的条数
        });
    }),
    actions: {
        nextPage() {
            // 设置下一页开始的位置
            // let lastEleId = this.get("store").get('startAtId');
            this.set('startAt', this.get("store").get('startAtId'));
        }
    }

});
```
注意：`store.set('typeMaps.metadata', { 'isPagination':true } );`这一行代码的设置，如果没有设置一个属性将导致无法分页，结果只是查询出2条数据并且点击下一页也是无效的。

### 分页展示页面

```hbs
{{! app/templates/pagination.hbs }}
{{pagination-test store=store model=model}}
```

```hbs
{{! app/templates/components/pagination-test.hbs }}
<button type="button" {{action 'nextPage'}}>下一页</button>
<table class="table">
  <thead>
    <tr>
      <th>#</th>
      <th>First Name</th>
      <th>Last Name</th>
      <th>Username</th>
    </tr>
  </thead>
  <tbody>
      {{#each list as |item index|}}
    <tr>
      <td>{{index}}</td>
      <td>{{item.id}}</td>
      <td>{{item.timestamp}}</td>
      <td>{{item.title}}</td>
    </tr>
    {{/each}}
  </tbody>
</table>
```

### 说明

目前只实现了`query`方法的分页，对于`findAll`、`findRecord`就没必要做分页了。

## 问题

如果使用过程发现问题请报告给我，或者直接提[issues](https://github.com/ubuntuvim/wildember/issues)。

## 贡献

如果你有更好的想法，或者你也想扩展wildember。欢迎您提交[Pull Requests](https://github.com/ubuntuvim/wildember/pulls)。

## 参考

* [https://ember-cli.com/extending/](https://ember-cli.com/extending/)
* wildember的主要代码是直接从[Emberfire](https://github.com/firebase/emberfire)fork过来的，我们只是做了部分的修改。非常感谢[Emberfire](https://github.com/firebase/emberfire)为我们提供非常棒的服务！
* [http://johnotander.com/ember/2014/12/14/creating-an-emberjs-addon-with-the-ember-cli/](http://johnotander.com/ember/2014/12/14/creating-an-emberjs-addon-with-the-ember-cli/)
* [https://dockyard.com/blog/2014/06/24/introducing_ember_cli_addons](https://dockyard.com/blog/2014/06/24/introducing_ember_cli_addons)
