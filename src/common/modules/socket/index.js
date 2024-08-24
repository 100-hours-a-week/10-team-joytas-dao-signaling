const axios = require('axios');
const config = require('../../config');
const https = require('https');

// TODO : 로깅 분리 및 모니터링 달기
// TODO : 요청 분리
// TOOD : 예외처리 분리
const redisCli = require('../redis'); // Redis 클라이언트 모듈 경로

module.exports = socketIoLoader = (io) => {
    const maximum = config.maximumConnection || 9;

    io.on('connection', async (socket) => {
        const socket_id = socket.id;
        const { token, objet_id } = socket.handshake.query;
        if (token && objet_id) {
            try {
                const response = await axios.post(
                    `${config.springServerUrl}/objets/signaling`,
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
                console.log(`[ Connection ] : Objet:${objet_id} / User ${response.data.data}`);
            } catch (err) {
                console.error('error:', err.response?.data);
                socket.emit('error_message', {
                    error: err.response?.data || 'Unknown error',
                });
                socket.disconnect(true);
                return;
            }
        } else {
            console.log('error: token or objet_id is missing');
            socket.disconnect(true);
            return;
        }

        socket.on('join_objet', async (data) => {
            const { objet_id, nickname, user_id, profile_image } = data;

            const objetKey = `objet:${objet_id}`;
            const socketKey = `socket:${socket_id}`;
            breakLine();
            console.log(`[ Join Objet ] - Request`);
            console.log(
                `[ Join Objet ] - Data : Objet ID: ${objet_id} / Nickname: ${nickname} / User ID: ${user_id} / Profile Image: ${profile_image}`
            );

            const usersInObjet = await redisCli.lRange(objetKey, 0, -1);
            if (usersInObjet.length >= maximum) {
                socket.emit('objet_full');
                return;
            }

            // Add the user to the list in Redis
            await redisCli.rPush(objetKey, JSON.stringify({ socket_id, nickname, user_id, profile_image }));
            await redisCli.set(socketKey, objet_id);

            socket.join(objet_id);
            console.log(`[ Join Objet ] - [Objet ID: ${objet_id}] / Socket ID: ${socket_id} Entered`);
            breakLine();
            const usersInThisObjet = usersInObjet
                .map((user) => JSON.parse(user))
                .filter((user) => user.socket_id !== socket_id);

            console.log(`[ Join Objet ] - User In This Objet `);
            console.log(usersInThisObjet);
            breakLine();
            io.to(socket_id).emit('all_users', usersInThisObjet);
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
            socket.to(data.answerReceiveID).emit('getAnswer', {
                sdp: data.sdp,
                answerSendID: data.answerSendID,
            });
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
        socket.on('disconnect', async () => {
            // TODO : SPRING SERVER에 exit objet 요청
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
                await redisCli.del(objetKey);
                await redisCli.rPush(objetKey, ...usersInObjet);

                if (usersInObjet.length === 0) {
                    await redisCli.del(objetKey);
                }

                socket.to(objet_id).emit('user_exit', { socket_id });
                console.log(`[ Disconnection ] :[ Objet ID: ${objet_id}] / Socket ID: ${socket_id} EXIT`);
            }
        });
    });
};

const breakLine = () => {
    console.log('\n');
};
