/**
 * Builds the Hermes JavaScript engine for iOS from its GitHub source instead of
 * downloading the prebuilt hermes-engine tarball from Maven, which can hang on
 * restricted networks (same reason as ios.buildReactNativeFromSource).
 *
 * Sets `ios.buildHermesFromSource` in Podfile.properties.json and makes the Podfile
 * export RCT_BUILD_HERMES_FROM_SOURCE=true when it is on. Building needs `cmake`.
 */
const { withPodfile, withPodfileProperties } = require('expo/config-plugins');

const PROP = 'ios.buildHermesFromSource';
const MARKER = '# @naite/with-ios-hermes-from-source';
const LINE = `ENV['RCT_BUILD_HERMES_FROM_SOURCE'] ||= 'true' if podfile_properties['${PROP}'] == 'true' ${MARKER}`;

module.exports = function withIosHermesFromSource(config, { enabled = true } = {}) {
  config = withPodfileProperties(config, (c) => {
    if (enabled) c.modResults[PROP] = 'true';
    else delete c.modResults[PROP];
    return c;
  });
  return withPodfile(config, (c) => {
    let src = c.modResults.contents;
    if (!src.includes(MARKER)) {
      const anchor = /^ENV\['RCT_USE_PREBUILT_RNCORE'\].*$/m;
      if (!anchor.test(src)) throw new Error('with-ios-hermes-from-source: Podfile anchor not found');
      src = src.replace(anchor, (m) => `${m}\n${LINE}`);
    }
    c.modResults.contents = src;
    return c;
  });
};
