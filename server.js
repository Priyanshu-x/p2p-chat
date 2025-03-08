const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

let waitingUser = null;

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    if (!waitingUser) {
        // First user waits for a peer
        waitingUser = socket;
        socket.emit("waiting", { message: "Waiting for a peer..." });
    } else {
        // Second user connects, pair them up
        socket.emit("paired", { partnerId: waitingUser.id, initiator: false });
        waitingUser.emit("paired", { partnerId: socket.id, initiator: true });

        const user1 = waitingUser;
        const user2 = socket;
        waitingUser = null;

        // Relay WebRTC signals
        user1.on("offer", (offer) => user2.emit("offer", offer));
        user2.on("answer", (answer) => user1.emit("answer", answer));
        user1.on("ice-candidate", (candidate) => user2.emit("ice-candidate", candidate));
        user2.on("ice-candidate", (candidate) => user1.emit("ice-candidate", candidate));
    }

    // Handle disconnects
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        if (waitingUser === socket) waitingUser = null;
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
