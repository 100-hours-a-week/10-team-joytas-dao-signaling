module.exports = socketIoLoader = (io) => {
    let users = {};

    let socketToRoom = {};

    const maximum = process.env.MAXIMUM || 9;

    io.on('connection', (socket) => {
        socket.on('join_room', (data) => {
            if (users[data.room]) {
                const length = users[data.room].length;
                if (length === maximum) {
                    socket.to(socket.id).emit('room_full');
                    return;
                }
                users[data.room].push({ id: socket.id, email: data.email });
            } else {
                users[data.room] = [{ id: socket.id, email: data.email }];
            }
            socketToRoom[socket.id] = data.room;

            socket.join(data.room);
            console.log(`[${socketToRoom[socket.id]}]: ${socket.id} enter`);

            const usersInThisRoom = users[data.room].filter((user) => user.id !== socket.id);

            console.log(usersInThisRoom);

            io.sockets.to(socket.id).emit('all_users', usersInThisRoom);
        });

        // WebRTC 연결을 시도
        socket.on('offer', (data) => {
            //console.log(data.sdp);
            // 대상 사용자에게 연결 제안(offer)을 전송.
            socket.to(data.offerReceiveID).emit('getOffer', {
                sdp: data.sdp,
                offerSendID: data.offerSendID,
                // TODO : user_id로 변경
                offerSendEmail: data.offerSendEmail,
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
            console.log(`[${socketToRoom[socket.id]}]: ${socket.id} exit`);
            const roomID = socketToRoom[socket.id];
            let room = users[roomID];
            if (room) {
                room = room.filter((user) => user.id !== socket.id);
                users[roomID] = room;
                if (room.length === 0) {
                    delete users[roomID];
                    return;
                }
            }
            socket.to(roomID).emit('user_exit', { id: socket.id });
            console.log(users);
        });
    });
};
