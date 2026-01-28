const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  '@/lib': path.resolve(__dirname, 'lib'),
};

module.exports = config;
