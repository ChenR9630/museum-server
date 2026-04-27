module.exports = {
  apps: [
    {
      name: 'museum-server',
      script: 'server.js',
      cwd: '/opt/museum-server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATA_DIR: '/opt/museum-server/data',
        JWT_SECRET: 'CHANGE_ME_TO_A_RANDOM_STRING'
      }
    }
  ]
}
