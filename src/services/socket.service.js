const logger = require('../common/modules/logger');
const objetRepository = require('../repositories/objet.repository');
const { getResponseTimeMs } = require('../common/utils/time.util');

const maximum = 9;

const handleObjetJoin = async (io, socket, data, socket_id) => {
    const { objet_id, nickname, user_id, profile_image } = data;
    const startTime = process.hrtime();
    const objetKey = `objet:${objet_id}`;
    const socketKey = `socket:${socket_id}`;

    logInfo(`[참여 요청]`, socket, { nickname, user_id, objet_id, socket_id });

    const usersInObjet = await objetRepository.getUsersInObjet(objetKey);
    const isUserExist = isUserAlreadyInObjet(usersInObjet, user_id);

    if (isUserExist) {
        return handleJoinError(socket, '이미 음성채팅에 참가중입니다.', 400, { nickname, user_id, socket_id });
    }

    if (usersInObjet.length >= maximum) {
        return handleJoinError(socket, '음성 채팅방이 가득 찼습니다.', 403, { objet_id, socket_id });
    }

    await updateRedisForJoin(objetKey, socketKey, { socket_id, nickname, user_id, profile_image }, objet_id);
    socket.join(objet_id);
    logResponseTime(`[참여 성공]`, socket, startTime, { nickname, user_id, objet_id, socket_id });

    const usersInThisObjet = getUsersInObjet(usersInObjet, socket_id);
    io.to(socket_id).emit('all_users', usersInThisObjet);
};

const handleOffer = (socket, data) => {
    logInfo(`[제안] - SDP 제안`, socket, data);
    socket.to(data.offerReceiveID).emit('getOffer', {
        sdp: data.sdp,
        offerSendID: data.offerSendID,
        offerSendNickname: data.offerSendNickname,
        offerSendProfileImage: data.offerSendProfileImage,
    });
};

const handleAnswer = (socket, data) => {
    logInfo(`[응답] - SDP 응답`, socket, data);
    socket.to(data.answerReceiveID).emit('getAnswer', {
        sdp: data.sdp,
        answerSendID: data.answerSendID,
    });
};

const handleCandidate = (socket, data) => {
    logInfo(`[후보] - ICE 후보`, socket, data);
    socket.to(data.candidateReceiveID).emit('getCandidate', {
        candidate: data.candidate,
        candidateSendID: data.candidateSendID,
    });
};

const handleDisconnect = async (socket, socket_id) => {
    const socketKey = `socket:${socket_id}`;
    const objet_id = await objetRepository.getObjetBySocket(socketKey);

    if (objet_id) {
        const objetKey = `objet:${objet_id}`;
        let usersInObjet = await objetRepository.getUsersInObjet(objetKey);
        usersInObjet = filterOutUser(usersInObjet, socket_id);

        await updateRedisForDisconnect(socketKey, objetKey, usersInObjet);
        socket.to(objet_id).emit('user_exit', { socket_id });
        logInfo(`[연결 종료]`, socket, { objet_id, socket_id });
    }
};

const isUserAlreadyInObjet = (users, user_id) => {
    return users.map((user) => JSON.parse(user)).find((user) => user.user_id === user_id);
};

const getUsersInObjet = (users, socket_id) => {
    return users.map((user) => JSON.parse(user)).filter((user) => user.socket_id !== socket_id);
};

const filterOutUser = (users, socket_id) => {
    return users.filter((user) => {
        const parsedUser = JSON.parse(user);
        return parsedUser.socket_id !== socket_id;
    });
};

const updateRedisForJoin = async (objetKey, socketKey, user, objet_id) => {
    await objetRepository.addUserToObjet(objetKey, user);
    await objetRepository.setSocketToObjet(socketKey, objet_id);
};

const updateRedisForDisconnect = async (socketKey, objetKey, usersInObjet) => {
    await objetRepository.deleteSocket(socketKey);
    if (usersInObjet.length > 0) {
        await objetRepository.updateUsersInObjet(objetKey, usersInObjet);
    } else {
        await objetRepository.deleteObjet(objetKey);
    }
};

const logInfo = (message, socket, details) => {
    logger.info(`${message} - x-request-id: ${socket.xRequestId}`, details);
};

const logResponseTime = (message, socket, startTime, details) => {
    const responseTime = getResponseTimeMs(startTime);
    logger.info(`${message} - 응답 시간: ${responseTime}ms, x-request-id: ${socket.xRequestId}`, details);
};

const handleJoinError = (socket, message, status, details) => {
    logInfo(`[참여 거부] - ${message}`, socket, details);
    socket.emit('error_message', {
        error: { status, message },
    });
    socket.disconnect(true);
};

module.exports = {
    handleObjetJoin,
    handleOffer,
    handleAnswer,
    handleCandidate,
    handleDisconnect,
};
