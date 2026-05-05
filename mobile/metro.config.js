const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for CJS modules (e.g., tweetnacl, bip39)
config.resolver.sourceExts.push('cjs');

// Handle crypto polyfills for React Native
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('expo-crypto'),
};

module.exports = config;
