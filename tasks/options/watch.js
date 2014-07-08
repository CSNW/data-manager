module.exports = {
  jshint: {
    files: ['dataManager.js'],
    tasks: ['jshint:src']
  },
  test: {
    files: ['dataManager.js', 'specs/**/*.js'],
    tasks: ['test']
  }
};
