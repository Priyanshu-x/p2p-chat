const logger = require('../config/logger');

// Map to store room state: roomCode -> { capacity: 2, users: Map<socketId, { socket, nickname }> }
const rooms = new Map();

module.exports = (io) => {
    io.on("connection", (socket) => {
        const { roomCode, nickname } = socket.handshake.auth;

        if (!roomCode || !nickname) {
            logger.warn(`Unauthenticated socket connection attempted without roomCode/nickname: ${socket.id}`);
            socket.emit("error_msg", "Room Code and Nickname are required.");
            socket.disconnect(true);
            return;
        }

        logger.info(`🟢 User connected: ${nickname} (${socket.id}) to room ${roomCode}`);

        if (!rooms.has(roomCode)) {
            rooms.set(roomCode, { capacity: 2, users: new Map() });
        }

        const room = rooms.get(roomCode);

        if (room.users.size >= room.capacity) {
            socket.emit("error_msg", "Room Full");
            socket.disconnect(true);
            return;
        }

        // Add user to room
        room.users.set(socket.id, { socket, nickname });
        socket.join(roomCode);

        // Notify existing users in the room about the new user
        socket.to(roomCode).emit("user-joined", { partnerId: socket.id, partnerNickname: nickname });

        // Let the new user know who is already in the room
        const existingPeers = [];
        for (const [id, user] of room.users.entries()) {
            if (id !== socket.id) {
                existingPeers.push({ partnerId: id, partnerNickname: user.nickname });
            }
        }
        
        socket.emit("joined-room", { 
            roomCode,
            capacity: room.capacity,
            existingPeers 
        });

        // Capacity unlock event
        socket.on("unlock_capacity", () => {
            if (rooms.has(roomCode)) {
                const r = rooms.get(roomCode);
                r.capacity = 15;
                io.to(roomCode).emit("capacity_unlocked", { capacity: 15 });
                logger.info(`Unlocked capacity for room ${roomCode} to 15`);
            }
        });

        // WebRTC Signaling Events
        // Directed to specific target IDs to support mesh networking
        
        socket.on("offer", ({ targetId, offer }) => {
            io.to(targetId).emit("offer", { senderId: socket.id, offer });
        });

        socket.on("answer", ({ targetId, answer }) => {
            io.to(targetId).emit("answer", { senderId: socket.id, answer });
        });

        socket.on("ice-candidate", ({ targetId, candidate }) => {
            io.to(targetId).emit("ice-candidate", { senderId: socket.id, candidate });
        });

        socket.on("disconnect", () => {
            logger.info(`🔴 User disconnected: ${nickname} (${socket.id})`);
            
            if (rooms.has(roomCode)) {
                const r = rooms.get(roomCode);
                r.users.delete(socket.id);
                
                if (r.users.size === 0) {
                    rooms.delete(roomCode); // Clean up empty room
                } else {
                    io.to(roomCode).emit("peer-disconnected", { partnerId: socket.id });
                }
            }
        });
    });
};
