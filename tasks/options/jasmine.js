module.exports = {
  options: {
    specs: ['specs/**/*.spec.js'],
    helpers: [
      'bower_components/jquery/dist/jquery.js',
      'bower_components/jasmine-jquery/lib/jasmine-jquery.js'
    ],
    vendor: [
      'bower_components/d3/d3.js',
      'bower_components/underscore/underscore.js',
      'bower_components/rsvp/rsvp.js'
    ]
  },

  src: {
    src: 'dataManager.js',
    options: {
      keepRunner: true,
      outfile: 'specs/index.html'
    }
  },

  build: {
    src: 'dataManager.min.js',
    options: {
      keepRunner: false
    }
  }
};
