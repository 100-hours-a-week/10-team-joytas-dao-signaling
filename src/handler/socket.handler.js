const logger = require('../common/modules/logger');
const redisCli = require('../common/modules/redis');
const config = require('../common/config');
const { getResponseTimeMs } = require('../common/utils/time.util');

const maximum = config.maximumConnection || 9;

const handleObjetJoin = async (io, socket, data, socket_id) => {
    const { objet_id, nickname, user_id, profile_image } = data;

    const startTime = process.hrtime();
    const objetKey = `objet:${objet_id}`;
    const socketKey = `socket:${socket_id}`;

    logger.info(
        `[참여 요청] - 사용자: ${nickname} (ID: ${user_id})가 오브제 ID: ${objet_id}, 소켓 ID: ${socket_id}에 참여 시도, x-request-id: ${socket.xRequestId}`
    );

    const usersInObjet = await redisCli.lRange(objetKey, 0, -1);

    const isUserExist = usersInObjet.map((user) => JSON.parse(user)).find((user) => user.user_id === user_id);

    if (isUserExist) {
        logger.warn(
            `[참여 거부] - 이미 채팅에 참여 중인 사용자: ${nickname} (ID: ${user_id}), 소켓 ID: ${socket_id}, x-request-id: ${socket.xRequestId}`
        );
        socket.emit('error_message', {
            error: { status: 400, message: '이미 음성채팅에 참가중입니다.' },
        });
        socket.disconnect(true);
        return;
    }

    if (usersInObjet.length >= maximum) {
        logger.warn(
            `[참여 거부] - 오브제 ID: ${objet_id}, 소켓 ID: ${socket_id}, 채팅방이 가득 찼습니다, x-request-id: ${socket.xRequestId}`
        );
        socket.emit('error_message', {
            error: { status: 403, message: '음성 채팅방이 가득 찼습니다.' },
        });
        socket.disconnect(true);
        return;
    }

    await redisCli.rPush(objetKey, JSON.stringify({ socket_id, nickname, user_id, profile_image }));
    await redisCli.set(socketKey, objet_id);

    socket.join(objet_id);
    const responseTime = getResponseTimeMs(startTime);
    logger.info(
        `[참여 성공] - 사용자: ${nickname} (ID: ${user_id})가 오브제 ID: ${objet_id}, 소켓 ID: ${socket_id}에 참여, x-request-id: ${socket.xRequestId}, 응답 시간: ${responseTime}ms`
    );

    const usersInThisObjet = usersInObjet
        .map((user) => JSON.parse(user))
        .filter((user) => user.socket_id !== socket_id);

    logger.info(`[현재 사용자] - 오브제 ID: ${objet_id}에 있는 사용자 목록, x-request-id: ${socket.xRequestId}`);
    logger.info(usersInThisObjet);

    io.to(socket_id).emit('all_users', usersInThisObjet);
};

const handleOffer = (socket, data) => {
    logger.info(
        `[제안] - SDP 제안이 ${data.offerSendID}에서 ${data.offerReceiveID}로 전송됨, x-request-id: ${socket.xRequestId}`
    );
    socket.to(data.offerReceiveID).emit('getOffer', {
        sdp: data.sdp,
        offerSendID: data.offerSendID,
        offerSendNickname: data.offerSendNickname,
        offerSendProfileImage: data.offerSendProfileImage,
    });
};

const handleAnswer = (socket, data) => {
    logger.info(
        `[응답] - SDP 응답이 ${data.answerSendID}에서 ${data.answerReceiveID}로 전송됨, x-request-id: ${socket.xRequestId}`
    );
    socket.to(data.answerReceiveID).emit('getAnswer', {
        sdp: data.sdp,
        answerSendID: data.answerSendID,
    });
};

const handleCandidate = (socket, data) => {
    logger.info(
        `[후보] - ICE 후보가 ${data.candidateSendID}에서 ${data.candidateReceiveID}로 전송됨, x-request-id: ${socket.xRequestId}`
    );
    socket.to(data.candidateReceiveID).emit('getCandidate', {
        candidate: data.candidate,
        candidateSendID: data.candidateSendID,
    });
};

const handleDisconnect = async (socket, socket_id) => {
    const socketKey = `socket:${socket_id}`;
    const objet_id = await redisCli.get(socketKey);

    if (objet_id) {
        const objetKey = `objet:${objet_id}`;
        let usersInObjet = await redisCli.lRange(objetKey, 0, -1);

        usersInObjet = usersInObjet.filter((user) => {
            const parsedUser = JSON.parse(user);
            return parsedUser.socket_id !== socket_id;
        });

        await redisCli.del(socketKey);
        if (usersInObjet.length > 0) {
            await redisCli.del(objetKey);
            for (const user of usersInObjet) {
                await redisCli.rPush(objetKey, user);
            }
        } else {
            await redisCli.del(objetKey);
        }

        socket.to(objet_id).emit('user_exit', { socket_id });
        logger.info(
            `[연결 종료] - 오브제 ID: ${objet_id}에서 사용자 ${socket_id} 연결 종료, x-request-id: ${socket.xRequestId}`
        );
    }
};

module.exports = {
    handleObjetJoin,
    handleOffer,
    handleAnswer,
    handleCandidate,
    handleDisconnect,
};
