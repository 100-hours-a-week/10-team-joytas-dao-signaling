module.exports = {
    apps: [
        {
            name: 'DAO-SIGNALING-SERVER',
            script: './app.js',
            instances: 1,
            exec_mode: 'cluster',
            watch: false,
            max_memory_restart: '1G',
        },
    ],
};
