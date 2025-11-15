// plugins/withThermalPrinterFix.js
const { withProjectBuildGradle } = require("@expo/config-plugins");

const withThermalPrinterFix = (config) => {
  return withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      let content = modConfig.modResults.contents;

      console.log('🔧 Applying Thermal Printer fix for @ccdilan library...');

      // HANYA jcenter fix - library baru mungkin tidak butuh subprojects config
      if (content.includes('jcenter.bintray.com') && !content.includes('allowInsecureProtocol')) {
        content = content.replace(
          /(maven\s*{\s*url\s*['"]http:\/\/jcenter\.bintray\.com\/['"])/,
          `$1
            allowIncreteProtocol = true`
        );
        console.log('✅ Fixed jcenter for Thermal Printer');
      }

      modConfig.modResults.contents = content;
    }
    return modConfig;
  });
};

module.exports = withThermalPrinterFix;