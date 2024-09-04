const express = require('express');
const config = require('./src/common/config');
const expressLoader = require('./src/common/modules/express');
const socketIoLoader = require('./src/common/modules/socket');

const app = express();
const socketio = require('socket.io');
const { START_MESSAGE } = require('./src/common/constants/express');

const initServer = async () => {
    await expressLoader(app);

    const server = app.listen(config.port, () => {
        console.log(START_MESSAGE);
    });

    const io = socketio.listen(server, { path: '/signaling/' });
    await socketIoLoader(io);
};

initServer();
