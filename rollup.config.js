import filesize from 'rollup-plugin-filesize';

export default {
  input: 'src/index.js',
  external: ['d3-fetch'],
  plugins: [filesize()],
  output: {
    format: 'umd',
    file: 'dist/data-manager.js',
    name: 'DataManager',
    globals: {
      'd3-fetch': 'd3'
    }
  }
};
