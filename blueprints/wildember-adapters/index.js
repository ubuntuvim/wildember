module.exports = {
  description: 'Generates a wildember adapter.',

  locals: function(options) {
    var baseClass       = 'WildemberAdapter';

    return {
      baseClass: baseClass
    };
  }
};
