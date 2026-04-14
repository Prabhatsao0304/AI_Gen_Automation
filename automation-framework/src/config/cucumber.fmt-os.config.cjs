/**
 * Cucumber configuration for FMT OS product.
 * Run: npm run test:fmt-os
 * Run smoke: npm run test:fmt-os:smoke
 */
module.exports = {
  default: {
    paths: ['src/products/fmt-os/features/**/*.feature'],
    require: [
      'src/hooks/world.js',
      'src/hooks/before-after.hooks.js',
      'src/products/fmt-os/step-definitions/**/*.js',
    ],
    format: [
      'progress-bar',
      'html:reports/fmt-os-report.html',
      'json:reports/fmt-os-report.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    tags: 'not @wip',
  },
  smoke: {
    paths: ['src/products/fmt-os/features/**/*.feature'],
    require: [
      'src/hooks/world.js',
      'src/hooks/before-after.hooks.js',
      'src/products/fmt-os/step-definitions/**/*.js',
    ],
    format: [
      'progress-bar',
      'html:reports/fmt-os-smoke-report.html',
      'json:reports/fmt-os-smoke-report.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    tags: '@smoke and not @wip',
  },
};
