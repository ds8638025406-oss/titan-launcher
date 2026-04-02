const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to make the app recognized as a launcher by Android
 * This adds the HOME and DEFAULT categories to the main activity
 */
const withLauncherIntent = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.application || !manifest.application[0]) {
      throw new Error('AndroidManifest.xml is missing application tag');
    }

    const application = manifest.application[0];
    
    if (!application.activity) {
      throw new Error('AndroidManifest.xml is missing activity tag');
    }

    // Find the main activity
    const mainActivity = application.activity.find(
      (activity) => activity.$?.['android:name']?.includes('.MainActivity')
    );

    if (!mainActivity) {
      throw new Error('MainActivity not found in AndroidManifest.xml');
    }

    // Ensure intent-filter array exists
    if (!mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = [];
    }

    // Check if HOME intent filter already exists
    const hasHomeIntent = mainActivity['intent-filter'].some((filter) => {
      return filter.category?.some(
        (cat) => cat.$?.['android:name'] === 'android.intent.category.HOME'
      );
    });

    // Add launcher intent filter if it doesn't exist
    if (!hasHomeIntent) {
      mainActivity['intent-filter'].push({
        action: [
          {
            $: {
              'android:name': 'android.intent.action.MAIN',
            },
          },
        ],
        category: [
          {
            $: {
              'android:name': 'android.intent.category.HOME',
            },
          },
          {
            $: {
              'android:name': 'android.intent.category.DEFAULT',
            },
          },
        ],
      });

      console.log('✅ Launcher intent filter added to MainActivity');
    } else {
      console.log('✅ Launcher intent filter already exists');
    }

    return config;
  });
};

module.exports = withLauncherIntent;
