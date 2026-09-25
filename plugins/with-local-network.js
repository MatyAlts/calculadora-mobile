const { AndroidConfig, withAndroidManifest, withInfoPlist } = require('expo/config-plugins');

module.exports = function withLocalNetwork(config, { development = false } = {}) {
  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$['android:usesCleartextTraffic'] = String(development);
    return mod;
  });

  return withInfoPlist(config, (mod) => {
    // This app owns these keys. Reset them when switching back from development.
    mod.modResults.NSAppTransportSecurity = {
      NSAllowsArbitraryLoads: development,
    };
    if (development) {
      // Development LAN IPs change. This broad exception is never a release setting.
      mod.modResults.NSLocalNetworkUsageDescription = 'Connect to the calculator API running on your computer.';
    } else {
      delete mod.modResults.NSLocalNetworkUsageDescription;
    }
    return mod;
  });
};
