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
          'node_modules/lodash/index.js',
          'node_modules/rsvp/dist/rsvp.js',
          'node_modules/d3/d3.js'
        ]
      },

      src: {
        src: 'data-manager.js',
        options: {
          keepRunner: true,
          outfile: 'specs/index.html'
        }
      },

      build: {
        src: 'data-manager.min.js',
        options: {
          keepRunner: false
        }
      }
    },

    jshint: {
      options: {
        'jshintrc': '.jshintrc'
      },

      src: ['data-manager.js'],
      specs: ['specs/*.spec.js']
    },

    uglify: {
      options: {
        banner: '<%= meta.banner %>',
        sourceMap: true,
        mangle: {
          reserved: ['d3', '_', 'rsvp']
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
        files: ['data-manager.js'],
        tasks: ['jshint:src']
      },
      test: {
        files: ['data-manager.js', 'specs/**/*.js'],
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
