const axios = require('axios');
const https = require('https');
const config = require('../common/config');
const logger = require('../common/modules/logger');
const { getResponseTimeMs } = require('../common/utils/time.util');
const handshakeMiddleware = require('../middlewares/handshake');
const {
    handleObjetJoin,
    handleOffer,
    handleAnswer,
    handleCandidate,
    handleDisconnect,
} = require('../services/socket.service');

module.exports = socketIoLoader = (io) => {
    io.use(handshakeMiddleware);

    io.on('connection', async (socket) => {
        const socket_id = socket.id;
        const { token, lounge_id } = socket.handshake.query;
        const startTime = process.hrtime();

        validateHandShake(token, lounge_id);

        try {
            await validateRequest(token, lounge_id, socket);
            logSuccess(socket, lounge_id, socket_id, startTime);
        } catch (err) {
            handleError(err, socket, lounge_id, socket_id, startTime);
            return;
        }

        setupSocketEvents(socket, io, socket_id);
    });
};

const validateRequest = async (token, lounge_id, socket) => {
    return axios.post(
        `${config.springServerUrl}/lounges/validate`,
        { lounge_id },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'x-request-id': socket.xRequestId,
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
        }
    );
};

const logSuccess = (socket, lounge_id, socket_id, startTime) => {
    const responseTime = getResponseTimeMs(startTime);
    logger.info(
        `[연결 성공] - 라운지 ID: ${lounge_id}, 소켓 ID: ${socket_id}, x-request-id: ${socket.xRequestId}, 응답 시간: ${responseTime}ms`
    );
};

const handleError = (err, socket, lounge_id, socket_id, startTime) => {
    const responseTime = getResponseTimeMs(startTime);
    logger.error(
        `[연결 오류] - 라운지 ID: ${lounge_id}, 소켓 ID: ${socket_id}, 오류 내용: ${
            JSON.stringify(err.response?.data) || err.message
        }, x-request-id: ${socket.xRequestId}, 응답 시간: ${responseTime}ms`
    );
    socket.emit('error_message', {
        error: err.response?.data || '알 수 없는 오류',
    });
    socket.disconnect(true);
};

const setupSocketEvents = (socket, io, socket_id) => {
    socket.on('join_objet', async (data) => {
        await handleObjetJoin(io, socket, data, socket_id);
    });

    socket.on('offer', (data) => {
        handleOffer(socket, data);
    });

    socket.on('answer', (data) => {
        handleAnswer(socket, data);
    });

    socket.on('candidate', (data) => {
        handleCandidate(socket, data);
    });

    socket.on('disconnect', async () => {
        await handleDisconnect(socket, socket_id);
    });
};

const validateHandShake = (token, lounge_id) => {
    if (!token || !lounge_id) {
        return handleMissingParams(socket, socket_id);
    }
};

const handleMissingParams = (socket, socket_id) => {
    logger.warn(`[연결 실패] - 토큰 또는 라운지 ID가 없습니다. 소켓 ID: ${socket_id}`);
    socket.emit('error_message', {
        error: '토큰 또는 라운지 ID가 없습니다',
    });
    socket.disconnect(true);
};
