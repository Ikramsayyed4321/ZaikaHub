module.exports = {
  apps: [
    {
      name: 'zaika-hub-api',
      script: 'backend/dist/index.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
