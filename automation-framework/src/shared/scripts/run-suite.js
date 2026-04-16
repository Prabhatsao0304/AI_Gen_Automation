import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../../..');
const isWindows = process.platform === 'win32';
const cucumberBin = path.resolve(
  projectRoot,
  isWindows ? 'node_modules/.bin/cucumber-js.cmd' : 'node_modules/.bin/cucumber-js'
);
const [, , configPath, reportPath, suiteName, ...restArgs] = process.argv;

if (!configPath || !reportPath || !suiteName) {
  console.error(
    'Usage: node src/shared/scripts/run-suite.js <config-path> <report-path> <suite-name> [extra cucumber args]'
  );
  process.exit(1);
}

function runCommand(command, args, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      cwd: projectRoot,
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

const resolvedReportPath = path.resolve(projectRoot, reportPath);
const designReportPath = resolvedReportPath.replace(/\.json$/i, '.design.json');
const htmlReportPath = resolvedReportPath.replace(/\.json$/i, '.html');
const dashboardPath = resolvedReportPath.replace(/\.json$/i, '.dashboard.html');

for (const artifactPath of [resolvedReportPath, designReportPath, htmlReportPath, dashboardPath]) {
  try {
    fs.rmSync(artifactPath, { force: true });
  } catch {
    // Ignore cleanup failures and continue with the current run.
  }
}

const functionalExitCode = await runCommand(
  cucumberBin,
  ['--config', configPath, ...restArgs],
  {
    DESIGN_AUDIT_REPORT_PATH: designReportPath,
  }
);

if (fs.existsSync(resolvedReportPath)) {
  await runCommand(process.execPath, [
    path.resolve(projectRoot, 'src/shared/scripts/slack-reporter.js'),
    resolvedReportPath,
    suiteName,
    designReportPath,
  ]);

  await runCommand(process.execPath, [
    path.resolve(projectRoot, 'src/shared/scripts/append-design-report.js'),
    htmlReportPath,
    designReportPath,
    suiteName,
  ]);

  await runCommand(process.execPath, [
    path.resolve(projectRoot, 'src/shared/scripts/generate-design-dashboard.js'),
    resolvedReportPath,
    designReportPath,
    dashboardPath,
    suiteName,
  ]);
} else {
  console.warn(`Functional report was not generated for this run: ${resolvedReportPath}`);
}

process.exit(functionalExitCode);
