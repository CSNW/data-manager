module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    env: process.env,
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '/*! <%= pkg.name %> - v<%= pkg.version %>\n' +
        ' * <%= pkg.homepage %>\n' +
        ' * License: <%= pkg.license %>\n' +
        ' */\n'
    },

    connect: {
      example: {
        options: {
          port: 4010,
          base: ['.', 'example'],
          open: true,
          hostname: 'localhost'
        }
      }
    },

    jasmine: {
      options: {
        specs: ['specs/**/*.spec.js'],
        vendor: [
          'bower_components/underscore/underscore.js',
          'bower_components/rsvp/rsvp.js',
          'bower_components/d3/d3.js'
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
    },

    jshint: {
      options: {
        'jshintrc': '.jshintrc'
      },

      src: ['dataManager.js'],
      specs: ['specs/*.spec.js'],
      build: ['dataManager.min.js']
    },

    uglify: {
      options: {
        banner: '<%= meta.banner %>',
        sourceMap: true,
        mangle: {
          except: ['d3', '_', 'rsvp']
        }
      },
      build: {
        files: {
          '<%= pkg.name %>.min.js': '<%= pkg.name %>.js'
        }
      }
    },

    watch: {
      jshint: {
        files: ['dataManager.js'],
        tasks: ['jshint:src']
      },
      test: {
        files: ['dataManager.js', 'specs/**/*.js'],
        tasks: ['test']
      }
    }
  });

  this.registerTask('default', ['test']);
  
  this.registerTask('test', 'jshing and run specs', [
    'jshint:src',
    'jshint:specs',
    'jasmine:src'
  ]);

  this.registerTask('serve', 'Run example (at http://localhost:4010)', [
    'connect:example:keepalive'
  ]);
};
