const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);

  console.log(`\n[afterPack] Applying clean ad-hoc code signature to ${appPath}...`);
  try {
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
    console.log(`[afterPack] Verifying signed bundle...`);
    execSync(`codesign --verify --deep --strict --verbose=2 "${appPath}"`, { stdio: 'inherit' });
    console.log(`[afterPack] Ad-hoc signature successfully applied and verified.\n`);
  } catch (err) {
    console.error(`[afterPack] Code signing error:`, err);
    throw err;
  }
};
