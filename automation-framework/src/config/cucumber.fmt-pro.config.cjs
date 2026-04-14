/**
 * Cucumber configuration for FMT Pro product.
 * Run: npm run test:fmt-pro
 * Run smoke: npm run test:fmt-pro:smoke
 */
module.exports = {
  default: {
    paths: ['src/products/fmt-pro/features/**/*.feature'],
    require: [
      'src/hooks/world.js',
      'src/hooks/before-after.hooks.js',
      'src/products/fmt-pro/step-definitions/**/*.js',
    ],
    format: [
      'progress-bar',
      'html:reports/fmt-pro-report.html',
      'json:reports/fmt-pro-report.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    tags: 'not @wip',
  },
  smoke: {
    paths: ['src/products/fmt-pro/features/**/*.feature'],
    require: [
      'src/hooks/world.js',
      'src/hooks/before-after.hooks.js',
      'src/products/fmt-pro/step-definitions/**/*.js',
    ],
    format: [
      'progress-bar',
      'html:reports/fmt-pro-smoke-report.html',
      'json:reports/fmt-pro-smoke-report.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    tags: '@smoke and not @wip',
  },
};
