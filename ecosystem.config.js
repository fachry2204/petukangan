// PM2 configuration for Plesk deployment
module.exports = {
  apps: [
    {
      name: 'ppsu-monitoring',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '512M',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_file: './logs/combined.log',
      time: true,
    },
  ],
};
