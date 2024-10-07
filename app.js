const fs = require('fs');
const https = require('https');
const express = require('express');
const socketio = require('socket.io');
const config = require('./src/common/config');
const logger = require('./src/common/modules/logger');
const expressLoader = require('./src/common/modules/express');
const socketIoLoader = require('./src/handlers/socket.handler');
const { START_MESSAGE } = require('./src/common/constants/express');

const app = express();

const initLocalServer = async () => {
    await expressLoader(app);

    const key = fs.readFileSync('cert.key');
    const cert = fs.readFileSync('cert.crt');

    const server = https.createServer({ key, cert }, app);
    const io = socketio.listen(server);

    await socketIoLoader(io);

    server.listen(config.port, () => {
        logger.info(START_MESSAGE);
    });
};

const initProdServer = async () => {
    await expressLoader(app);

    const server = app.listen(config.port, () => {
        logger.info({ message: START_MESSAGE });
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
        break;
    default:
        initLocalServer();
        break;
}
