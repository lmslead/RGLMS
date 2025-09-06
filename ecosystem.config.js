module.exports = {
  apps: [
    {
      name: 'lms-backend',
      script: 'server/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '0.0.0.0'
      },
      error_file: '/var/log/lms/err.log',
      out_file: '/var/log/lms/out.log',
      log_file: '/var/log/lms/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: '56.228.26.240',
      ref: 'origin/main',
      repo: 'https://github.com/lmslead/RGLMS.git',
      path: '/var/www/lms',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
