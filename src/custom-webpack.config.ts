const { EnvironmentPlugin } = require('webpack');
import { isDevMode } from '@angular/core';

if (!isDevMode()) {
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
  
}