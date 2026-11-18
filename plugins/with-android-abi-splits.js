/**
 * Lets release builds produce one APK per CPU type instead of one APK carrying
 * all four, which keeps each download small.
 *
 * Off by default, so local builds (`npm run android`, Android Studio) are unchanged.
 * Turn it on with the Gradle property `naiteAbiSplits`, as the Release workflow does:
 *   ./gradlew assembleRelease -PnaiteAbiSplits=true
 * Outputs: app-arm64-v8a-release.apk (almost every current phone) and
 * app-armeabi-v7a-release.apk (older 32-bit phones).
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @naite/with-android-abi-splits';
const BLOCK = `    ${MARKER}
    splits {
        abi {
            enable project.hasProperty('naiteAbiSplits')
            reset()
            include 'arm64-v8a', 'armeabi-v7a'
            universalApk false
        }
    }
`;

module.exports = function withAndroidAbiSplits(config) {
  return withAppBuildGradle(config, (c) => {
    let src = c.modResults.contents;
    if (!src.includes(MARKER)) {
      const anchor = /^    defaultConfig \{$/m;
      if (!anchor.test(src)) throw new Error('with-android-abi-splits: defaultConfig anchor not found in app/build.gradle');
      src = src.replace(anchor, `${BLOCK}    defaultConfig {`);
    }
    c.modResults.contents = src;
    return c;
  });
};
