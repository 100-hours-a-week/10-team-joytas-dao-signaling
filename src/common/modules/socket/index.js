const axios = require('axios');
const config = require('../../config');
const https = require('https');

module.exports = socketIoLoader = (io) => {
    let users = {};

    let socketToObjet = {};

    const maximum = config.maximumConnection || 9;

    io.on('connection', async (socket) => {
        const socket_id = socket.id;
        const { token, objet_id } = socket.handshake.query;
        if (token && objet_id) {
            try {
                const response = await axios.post(
                    config.springServerUrl,
                    { objet_id },
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
                console.error('token error:', err.response?.data);
                socket.emit('error_message', {
                    error: err.response?.data || 'Unknown error',
                });
                socket.disconnect(true);
                return;
            }
        } else {
            console.log('token or objet_id is missing');
            socket.disconnect(true);
            return;
        }

        socket.on('join_objet', (data) => {
            const { objet_id, nickname, user_id, profile_image } = data;

            if (users[objet_id]) {
                const objetConnectNumber = users[objet_id].length;
                if (objetConnectNumber === maximum) {
                    socket.to(socket_id).emit('objet_full');
                    return;
                }
                users[objet_id].push({ socket_id, nickname, user_id, profile_image });
            } else {
                users[objet_id] = [{ socket_id, nickname, user_id, profile_image }];
            }
            socketToObjet[socket_id] = objet_id;

            socket.join(objet_id);
            console.log(`[${socketToObjet[socket_id]}]: ${socket_id} enter`);

            const usersInThisObjet = users[objet_id].filter((user) => user.socket_id !== socket_id);

            console.log(usersInThisObjet);

            io.sockets.to(socket_id).emit('all_users', usersInThisObjet);
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
            console.log(`[${socketToObjet[socket_id]}]: ${socket_id} exit`);
            const objetID = socketToObjet[socket_id];
            let objet = users[objetID];
            if (objet) {
                objet = objet.filter((user) => user.socket_id !== socket_id);
                users[objetID] = objet;
                if (objet.length === 0) {
                    delete users[objetID];
                    return;
                }
            }
            socket.to(objetID).emit('user_exit', { socket_id });
            console.log(users);
        });
    });
};
