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
          'bower_components/lodash/lodash.js',
          'bower_components/rsvp/rsvp.js',
          'bower_components/d3/d3.js'
        ]
      },

      src: {
        src: 'DataManager.js',
        options: {
          keepRunner: true,
          outfile: 'specs/index.html'
        }
      },

      build: {
        src: 'DataManager.min.js',
        options: {
          keepRunner: false
        }
      }
    },

    jshint: {
      options: {
        'jshintrc': '.jshintrc'
      },

      src: ['DataManager.js'],
      specs: ['specs/*.spec.js']
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
        files: ['DataManager.js'],
        tasks: ['jshint:src']
      },
      test: {
        files: ['DataManager.js', 'specs/**/*.js'],
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
