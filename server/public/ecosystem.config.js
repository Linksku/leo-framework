module.exports = {
  name: '%APP_NAME_LOWER%',
  cwd: 'build/server',
  script: 'main.js',
  min_uptime: '10s',
  max_restarts: 5,
  max_memory_restart: '500M',
  restart_delay: '60000',
  exp_backoff_restart_delay: 1000,
  watch: true,
};