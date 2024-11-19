const { EnvironmentPlugin } = require('webpack');

require('dotenv').config();

module.exports = {
  output: {
    crossOriginLoading: 'anonymous'
  },
  plugins: [
    new EnvironmentPlugin([
      'apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId','measurementId'
    ])
  ]
}
