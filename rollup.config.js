import buble from 'rollup-plugin-buble';
import filesize from 'rollup-plugin-filesize';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const banner = `/*!
 * ${pkg.name} - ${pkg.description}
 * v${pkg.version} - ${pkg.homepage} - @license: ${pkg.license}
 */`;

export default [
  {
    input: 'src/index.js',
    external: ['d3-fetch'],
    plugins: [buble(), filesize()],
    output: {
      format: 'umd',
      file: 'dist/data-manager.umd.js',
      name: 'DataManager',
      banner,
      globals: {
        'd3-fetch': 'd3'
      },
      sourcemap: true
    }
  },
  {
    input: 'src/index.js',
    external: ['d3-fetch'],
    plugins: [buble(), terser(), filesize()],
    output: {
      format: 'umd',
      file: 'dist/data-manager.umd.min.js',
      name: 'DataManager',
      banner,
      globals: {
        'd3-fetch': 'd3'
      },
      sourcemap: true
    }
  }
];
