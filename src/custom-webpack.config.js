const { EnvironmentPlugin } = require('webpack');
const dotenv = require('dotenv');

// Завантажуємо змінні середовища, якщо не в режимі розробки
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
