/**
 * Combined Cucumber configuration — runs both FMT OS and FMT Pro.
 * Run: npm run test:regression
 * Run smoke: npm run test:smoke
 */
module.exports = {
  default: {
    paths: [
      'src/products/fmt-os/features/**/*.feature',
      'src/products/fmt-pro/features/**/*.feature',
    ],
    require: [
      'src/hooks/world.js',
      'src/hooks/before-after.hooks.js',
      'src/products/fmt-os/step-definitions/**/*.js',
      'src/products/fmt-pro/step-definitions/**/*.js',
    ],
    format: [
      'progress-bar',
      'html:reports/regression-report.html',
      'json:reports/regression-report.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    tags: 'not @wip',
  },
  smoke: {
    paths: [
      'src/products/fmt-os/features/**/*.feature',
      'src/products/fmt-pro/features/**/*.feature',
    ],
    require: [
      'src/hooks/world.js',
      'src/hooks/before-after.hooks.js',
      'src/products/fmt-os/step-definitions/**/*.js',
      'src/products/fmt-pro/step-definitions/**/*.js',
    ],
    format: [
      'progress-bar',
      'html:reports/smoke-report.html',
      'json:reports/smoke-report.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    tags: '@smoke and not @wip',
  },
};
