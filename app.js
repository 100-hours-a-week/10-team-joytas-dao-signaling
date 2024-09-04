const express = require('express');
const fs = require('fs');
const https = require('https');
const config = require('./src/common/config');
const expressLoader = require('./src/common/modules/express');
const socketIoLoader = require('./src/common/modules/socket');

const app = express();

const socketio = require('socket.io');
const { START_MESSAGE } = require('./src/common/constants/express');

const initLocalServer = async () => {
    await expressLoader(app);

    const key = fs.readFileSync('cert.key');
    const cert = fs.readFileSync('cert.crt');

    const server = https.createServer({ key, cert }, app);
    const io = socketio.listen(server);

    await socketIoLoader(io);

    server.listen(config.port, () => {
        console.log(START_MESSAGE);
    });
};

const initProdServer = async () => {
    await expressLoader(app);

    const server = app.listen(config.port, () => {
        console.log(START_MESSAGE);
    });
    const io = socketio.listen(server, { path: '/signaling/' });

    await socketIoLoader(io);
};

switch (config.envMode) {
    case 'prod':
        initProdServer();
        break;
    case 'dev':
        initProdServer();
    default:
        initLocalServer();
        break;
}
