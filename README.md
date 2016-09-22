# wildember简介

wildember是一个方便、快捷连接野狗实时服务适配器。

[wildemer](https://github.com/ubuntuvim/wildemer)是一个类似[Emberfire](https://github.com/firebase/emberfire)的适配器，
不同的是前者用于适配[野狗](https://www.wilddog.com/)实时服务，
后者用于适配[firebase](https://www.firebase.com/)实时服务。  


野狗和firebase都是实时的数据服务，但是遗憾的是firebase是谷歌的，你懂的在天朝想访问都是比较那个啥的！！！
所以找了国内的替代品——野狗。当然不是时候野狗不好，如果你使用过这两个服务就会发现其实野狗就是firebase（野狗大部分的设计应该都是参考firebase的）。
也正是因为firebase无法访问所以我们为Ember.js的开发提供了连接野狗的适配器wildemer。它的使用方式和firebase一模一样，因为WildEmber是直接fork Emberfire的（说难听点其实是抄Emberfire的！！）。


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

## 问题

如果使用过程发现问题请报告给我，或者直接提[issues](https://github.com/ubuntuvim/wildember/issues)。

## 贡献

如果你有更好的想法，或者你也想扩展wildember。欢迎您提交[Pull Requests](https://github.com/ubuntuvim/wildember/pulls)。

## 参考

* [https://ember-cli.com/extending/](https://ember-cli.com/extending/)
* wildember的主要代码是直接从[Emberfire](https://github.com/firebase/emberfire)fork过来的，我们只是做了部分的修改。非常感谢[Emberfire](https://github.com/firebase/emberfire)为我们提供非常棒的服务！
* [http://johnotander.com/ember/2014/12/14/creating-an-emberjs-addon-with-the-ember-cli/](http://johnotander.com/ember/2014/12/14/creating-an-emberjs-addon-with-the-ember-cli/)
* [https://dockyard.com/blog/2014/06/24/introducing_ember_cli_addons](https://dockyard.com/blog/2014/06/24/introducing_ember_cli_addons)
