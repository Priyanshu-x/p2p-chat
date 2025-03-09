const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

let waitingUser = null;

io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    if (!waitingUser) {
        waitingUser = socket;
        socket.emit("waiting", { message: "Waiting for a peer..." });
    } else {
        const user1 = waitingUser;
        const user2 = socket;
        waitingUser = null;

        console.log(`🔗 Pairing ${user1.id} with ${user2.id}`);

        user1.emit("paired", { partnerId: user2.id, initiator: true });
        user2.emit("paired", { partnerId: user1.id, initiator: false });
    }

    socket.on("offer", (offer) => {
        socket.broadcast.emit("offer", offer);
    });

    socket.on("answer", (answer) => {
        socket.broadcast.emit("answer", answer);
    });

    socket.on("ice-candidate", (candidate) => {
        socket.broadcast.emit("ice-candidate", candidate);
    });

    socket.on("disconnect", () => {
        console.log("🔴 User disconnected:", socket.id);
        if (waitingUser === socket) waitingUser = null;
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
