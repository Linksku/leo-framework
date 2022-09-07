module.exports = {
  name: '%APP_NAME_LOWER%',
  script: 'build/production/server/main.js',
  node_args: '--experimental-specifier-resolution=node',
  env: {
    NODE_ENV: 'production',
  },
  min_uptime: '10s',
  max_restarts: 5,
  max_memory_restart: '500M',
  restart_delay: '60000',
  exp_backoff_restart_delay: 1000,
  watch: true,
};
