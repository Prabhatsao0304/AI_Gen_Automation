/**
 * Single Cucumber config for all products.
 *
 * Add a new product: extend PRODUCTS (id + optional reportSlug), create
 * src/products/<id>/features/ and src/products/<id>/step-definitions/, then add npm scripts.
 *
 * Profiles (use: cucumber-js --config src/config/cucumber.config.cjs --profile <name>):
 *   fmt-os | fmt-os-smoke | fmt-pro | fmt-pro-smoke | all | all-smoke | wip
 * Default profile (no --profile) = all (full regression, all registered products).
 */

'use strict';

const HOOKS = [
  'src/hooks/world.js',
  'src/hooks/before-after.hooks.js',
];

/**
 * @typedef {{ id: string, reportSlug?: string }} ProductEntry
 * reportSlug defaults to id; used in reports/<reportSlug>-report.json
 */

/** @type {ProductEntry[]} */
const PRODUCTS = [
  { id: 'fmt-os' },
  { id: 'fmt-pro' },
];

const FORMAT_OPTIONS = { snippetInterface: 'async-await' };

function featureGlob(productId) {
  return `src/products/${productId}/features/**/*.feature`;
}

function stepsGlob(productId) {
  return `src/products/${productId}/step-definitions/**/*.js`;
}

function reportFormats(baseName) {
  const effectiveBaseName = process.env.REPORT_BASENAME || baseName;
  return [
    'progress-bar',
    `html:reports/${effectiveBaseName}.html`,
    `json:reports/${effectiveBaseName}.json`,
  ];
}

function productProfile(productId, smoke) {
  const p = PRODUCTS.find((x) => x.id === productId);
  if (!p) {
    throw new Error(`[cucumber.config] Unknown product "${productId}". Add it to PRODUCTS.`);
  }
  const slug = p.reportSlug || p.id;
  const baseName = smoke ? `${slug}-smoke-report` : `${slug}-report`;
  return {
    paths: [featureGlob(productId)],
    require: [...HOOKS, stepsGlob(productId)],
    format: reportFormats(baseName),
    formatOptions: FORMAT_OPTIONS,
    tags: smoke ? '@smoke and not @wip' : 'not @wip',
  };
}

function allProfile(smoke) {
  const baseName = smoke ? 'smoke-report' : 'regression-report';
  return {
    paths: PRODUCTS.map((p) => featureGlob(p.id)),
    require: [...HOOKS, ...PRODUCTS.map((p) => stepsGlob(p.id))],
    format: reportFormats(baseName),
    formatOptions: FORMAT_OPTIONS,
    tags: smoke ? '@smoke and not @wip' : 'not @wip',
  };
}

function wipProfile() {
  return {
    paths: PRODUCTS.map((p) => featureGlob(p.id)),
    require: [...HOOKS, ...PRODUCTS.map((p) => stepsGlob(p.id))],
    format: reportFormats('wip-report'),
    formatOptions: FORMAT_OPTIONS,
    tags: '@wip',
  };
}

module.exports = {
  default: allProfile(false),
  all: allProfile(false),
  'all-smoke': allProfile(true),
  'fmt-os': productProfile('fmt-os', false),
  'fmt-os-smoke': productProfile('fmt-os', true),
  'fmt-pro': productProfile('fmt-pro', false),
  'fmt-pro-smoke': productProfile('fmt-pro', true),
  wip: wipProfile(),
};
