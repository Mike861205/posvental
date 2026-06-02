module.exports = {
  apps: [
    {
      name: "posexercise",
      cwd: "/var/www/posvental",
      script: "npm",
      args: "run start -- -p 3002",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "700M",
      time: true,
    },
  ],
};
