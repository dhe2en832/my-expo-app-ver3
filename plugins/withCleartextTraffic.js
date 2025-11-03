// plugins/withCleartextTraffic.js
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, async (innerConfig) => {
    const manifest = innerConfig.modResults.manifest;
    if (!manifest.application) {
      manifest.application = [{}];
    }
    const application = manifest.application[0];
    application.$ = application.$ || {};
    application.$['android:usesCleartextTraffic'] = 'true';
    return innerConfig;
  });
};