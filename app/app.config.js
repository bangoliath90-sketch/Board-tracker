// Expo Go only loads updates whose runtime version names its SDK, while the
// installed Android app uses its own runtime version. Publish with EXPO_GO=1
// to reach Expo Go, and without it to reach the installed app.
module.exports = ({ config }) => ({
  ...config,
  runtimeVersion: process.env.EXPO_GO ? 'exposdk:58.0.0' : config.runtimeVersion,
});
