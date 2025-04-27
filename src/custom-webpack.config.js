const { EnvironmentPlugin } = require('webpack');
const dotenv = require('dotenv');
const fs = require('fs');

if (fs.existsSync('.env')) {
  dotenv.config();

  module.exports = {
    output: {
      crossOriginLoading: 'anonymous'
    },
    plugins: [
      new EnvironmentPlugin([
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId',
        'measurementId'
      ])
    ]
  };
} else {
  console.warn('[WARN] .env does not exist.');
}