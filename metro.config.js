// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Força o Metro a aceitar ficheiros .cjs do Firebase
config.resolver.sourceExts.push('cjs');
// Desliga a nova resolução restrita que quebra o Firebase Auth
config.resolver.unstable_enablePackageExports = false;

module.exports = config;