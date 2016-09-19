module.exports = {
  description: 'Generates a wildember adapter.',

  locals: function(options) {
    var wildemberUrl     = 'config.wildember';
    var baseClass       = 'WildemberAdapter';

    return {
      baseClass: baseClass,
      wildemberUrl: wildemberUrl
    };
  }
};
