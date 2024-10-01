const { v4: uuidv4 } = require('uuid');
const logger = require('../common/modules/logger');

module.exports = (socket, next) => {
    let xRequestId = socket.handshake.headers['x-request-id'];

    if (!xRequestId) {
        xRequestId = uuidv4();
        logger.info(`x-request-id 생성 : ${xRequestId}`);
    }

    socket.xRequestId = xRequestId;
    logger.info(`x-request-id: ${xRequestId}로 웹소켓 연결 설정`);
    next();
};
