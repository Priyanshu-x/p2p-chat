const logger = require('../config/logger');

let waitingUser = null;

module.exports = (io) => {
    io.on("connection", (socket) => {
        const session = socket.request.session;
        if (!session || !session.userId) {
            logger.warn(`Unauthenticated socket connection attempted: ${socket.id}`);
            socket.disconnect(true);
            return;
        }

        const username = session.username;
        logger.info(`🟢 User connected: ${username} (${socket.id})`);

        // Pairing Logic
        if (!waitingUser) {
            waitingUser = socket;
            socket.emit("waiting", { message: "Waiting for a peer..." });
        } else {
            const user1 = waitingUser;
            const user2 = socket;

            // Prevent pairing with self (if multiple tabs)
            if (user1.id === user2.id) {
                return;
            }

            waitingUser = null;

            const roomId = `room_${user1.id}_${user2.id}`;
            user1.join(roomId);
            user2.join(roomId);

            logger.info(`🔗 Pairing ${user1.request.session.username} with ${user2.request.session.username} in ${roomId}`);

            // Notify both users
            io.to(user1.id).emit("paired", { partnerId: user2.id, initiator: true, roomId });
            io.to(user2.id).emit("paired", { partnerId: user1.id, initiator: false, roomId });

            // Setup disconnect handlers for this pair to clean up if needed
            // (Generic disconnect handles global cleanup)
        }

        // Signaling - broadcast only to room
        // Note: 'offer', 'answer', 'ice-candidate' usually go to specific peer.
        // With creating a room for 2 people, we can just broadcast to room exclude sender.

        socket.on("offer", (offer) => {
            // Get rooms this socket is in (excluding its own default room)
            const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
            rooms.forEach(room => {
                socket.to(room).emit("offer", offer);
            });
        });

        socket.on("answer", (answer) => {
            const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
            rooms.forEach(room => {
                socket.to(room).emit("answer", answer);
            });
        });

        socket.on("ice-candidate", (candidate) => {
            const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
            rooms.forEach(room => {
                socket.to(room).emit("ice-candidate", candidate);
            });
        });

        // Chat messages via DataChannel are P2P, but if we wanted server relay:
        // socket.on("message", (msg) => { ... })

        socket.on("disconnect", () => {
            logger.info(`🔴 User disconnected: ${username} (${socket.id})`);
            if (waitingUser === socket) {
                waitingUser = null;
            }
            // Ideally notify partner if in a room
            const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
            rooms.forEach(room => {
                socket.to(room).emit("peer-disconnected");
            });
        });
    });
};
