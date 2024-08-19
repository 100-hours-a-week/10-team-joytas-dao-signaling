module.exports = {
    apps: [
        {
            name: 'DAO-SIGNALING-SERVER',
            script: './server.js',
            instances: 2,
            exec_mode: 'cluster',
            watch: false,
            max_memory_restart: '1G',
        },
    ],
};
