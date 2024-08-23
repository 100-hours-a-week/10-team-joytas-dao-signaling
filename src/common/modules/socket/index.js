const axios = require('axios');
const config = require('../../config');
const https = require('https');

module.exports = socketIoLoader = (io) => {
    let users = {};

    let socketToObjet = {};

    const maximum = config.maximumConnection || 9;

    io.on('connection', async (socket) => {
        const socketId = socket.id;
        const { token, objetId } = socket.handshake.query;
        if (token && objetId) {
            try {
                const response = await axios.post(
                    config.springServerUrl,
                    { objetId },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false,
                        }),
                    }
                );
                console.log('Data : ', response.data);
            } catch (err) {
                console.log(err);

                console.error('token error:', err.response?.data);
                socket.emit('error_message', {
                    error: err.response?.data || 'Unknown error',
                });
                socket.disconnect(true);
                return;
            }
        } else {
            console.log('token or objetId is missing');
            socket.disconnect(true);
            return;
        }

        socket.on('join_objet', (data) => {
            const { nickname, userId, profileImage } = data;
            if (users[data.objet]) {
                const length = users[data.objet].length;
                if (length === maximum) {
                    socket.to(socketId).emit('objet_full');
                    return;
                }
                users[data.objet].push({ socketId, nickname, userId, profileImage });
            } else {
                users[data.objet] = [{ socketId, nickname, userId, profileImage }];
            }
            socketToObjet[socketId] = data.objet;

            socket.join(data.objet);
            console.log(`[${socketToObjet[socketId]}]: ${socketId} enter`);

            const usersInThisObjet = users[data.objet].filter((user) => user.id !== socketId);

            console.log(usersInThisObjet);

            io.sockets.to(socketId).emit('all_users', usersInThisObjet);
        });

        // WebRTC 연결을 시도
        socket.on('offer', (data) => {
            //console.log(data.sdp);
            // 대상 사용자에게 연결 제안(offer)을 전송.
            socket.to(data.offerReceiveID).emit('getOffer', {
                sdp: data.sdp,
                offerSendID: data.offerSendID,
                // TODO : user_id로 변경
                offerSendNickname: data.offerSendNickname,
            });
        });

        // WebRTC 연결에 대한 응답 처리
        socket.on('answer', (data) => {
            //console.log(data.sdp);
            socket.to(data.answerReceiveID).emit('getAnswer', { sdp: data.sdp, answerSendID: data.answerSendID });
        });

        // ICE 후보 정보 전송
        socket.on('candidate', (data) => {
            //console.log(data.candidate);
            socket.to(data.candidateReceiveID).emit('getCandidate', {
                candidate: data.candidate,
                candidateSendID: data.candidateSendID,
            });
        });

        // 클라이언트 연결 해제 처리
        socket.on('disconnect', () => {
            console.log(`[${socketToObjet[socketId]}]: ${socketId} exit`);
            const objetID = socketToObjet[socketId];
            let objet = users[objetID];
            if (objet) {
                objet = objet.filter((user) => user.id !== socketId);
                users[objetID] = objet;
                if (objet.length === 0) {
                    delete users[objetID];
                    return;
                }
            }
            socket.to(objetID).emit('user_exit', { socketId });
            console.log(users);
        });
    });
};
