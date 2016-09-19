import wilddog from 'wilddog';

// export const DEFAULT_NAME = '[EmberFire default app]';

export default {
  create(application) {
    const config = application.container.lookupFactory('config:environment');
    if (!config || typeof config.wildember !== 'object') {
      throw new Error('Please set the `wildember` property in your environment config.');
    }


    // 获取野狗连接
    wilddog.initializeApp(config.wildember);
    let wd = wilddog.sync().ref();
    if (!wd) {
        throw new Error('连接`widdog`失败！');
    }
    return wd;


    // let app;
    //
    // try {
    //   app = firebase.app(DEFAULT_NAME);
    // } catch (e) {
    //   app = firebase.initializeApp(config.firebase, DEFAULT_NAME);
    // }
    //
    // return app.database().ref();
  },

  config: null,
  isServiceFactory: true
};
