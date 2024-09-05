const axios = require('axios');
const config = require('../../config');
const https = require('https');

// TODO : 로깅 분리 및 모니터링 달기
// TODO : 요청 분리
// TOOD : 예외처리 분리
const redisCli = require('../redis');

module.exports = socketIoLoader = (io) => {
    const maximum = config.maximumConnection || 9;

    io.on('connection', async (socket) => {
        const socket_id = socket.id;
        const { token, lounge_id } = socket.handshake.query;
        if (token && lounge_id) {
            try {
                const response = await axios.post(
                    `${config.springServerUrl}/objets/signaling`,
                    { lounge_id },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        httpsAgent: new https.Agent({
                            rejectUnauthorized: false,
                        }),
                    }
                );
                console.log(`[ Connection ] : Lounge:${lounge_id} / User ${response.data.data}`);
            } catch (err) {
                console.error('error:', err.response?.data);
                socket.emit('error_message', {
                    error: err.response?.data || 'Unknown error',
                });
                socket.disconnect(true);
                return;
            }
        } else {
            console.log('error: token or lounge_id is missing');
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

            const isUserExist = usersInObjet.map((user) => JSON.parse(user)).filter((user) => user.user_id === user_id);

            if (isUserExist) {
                socket.emit('already_join');
                return;
            }

            if (usersInObjet.length >= maximum) {
                socket.emit('objet_full');
                return;
            }

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

        socket.on('offer', (data) => {
            socket.to(data.offerReceiveID).emit('getOffer', {
                sdp: data.sdp,
                offerSendID: data.offerSendID,
                offerSendNickname: data.offerSendNickname,
                offerSendProfileImage: data.offerSendProfileImage,
            });
        });

        socket.on('answer', (data) => {
            socket.to(data.answerReceiveID).emit('getAnswer', {
                sdp: data.sdp,
                answerSendID: data.answerSendID,
            });
        });

        socket.on('candidate', (data) => {
            socket.to(data.candidateReceiveID).emit('getCandidate', {
                candidate: data.candidate,
                candidateSendID: data.candidateSendID,
            });
        });

        socket.on('disconnect', async () => {
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
                for (const user of usersInObjet) {
                    await redisCli.rPush(objetKey, user);
                }

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
