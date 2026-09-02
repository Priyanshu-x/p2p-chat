const names = ['Levi', 'Goku', 'Lelouch', 'Itachi', 'Naruto', 'Saitama', 'Deadpool', 'Wolverine',
    'Eren', 'Zoro', 'Lightning', 'Cloud', 'Aerith', 'Jinx', 'Vi', 'Geralt', 'Ciri',
    'Dante', 'Vergil', 'Tanjiro', 'Nezuko', 'Zenitsu', 'Gojo', 'Sukuna', 'Megumi',
    'Luffy', 'Sanji', 'Ichigo', 'Rukia', 'Batman', 'Joker', 'Neo', 'Trinity',
    'Morpheus', 'Vader', 'Kylo', 'Rey', 'Spider', 'Miles', 'Kirito', 'Asuna',
    'Rem', 'Subaru', 'Aqua', 'Megumin', 'Kazuma', 'Albedo', 'Rimuru', 'Shion'];

function getRandomName() {
    return names[Math.floor(Math.random() * names.length)];
}

function generateRoomCode() {
    return `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("roomCodeInput").value = generateRoomCode();
    document.getElementById("nicknameInput").value = getRandomName();
});

let socket;
let localStream;
let myNickname = "";
let myRoomCode = "";

// Mesh state
const peers = {}; // map of targetId -> { peerConnection, dataChannel, nickname }

// Reply Feature
let replyingTo = null; // { id, text, sender }

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const statusContainer = document.getElementById("connectionStatus");

function updateStatus(state) {
    if (!statusDot || !statusText || !statusContainer) return;
    statusContainer.classList.remove("hidden");

    switch (state) {
        case 'connected':
            statusDot.className = "w-2 h-2 rounded-full bg-yellow-500 transition-colors duration-300";
            statusText.textContent = "Waiting for Peer";
            break;
        case 'paired':
            statusDot.className = "w-2 h-2 rounded-full bg-green-500 transition-colors duration-300 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
            statusText.textContent = "Securely Connected";
            break;
        case 'disconnected':
            statusDot.className = "w-2 h-2 rounded-full bg-red-500 transition-colors duration-300";
            statusText.textContent = "Offline";
            break;
    }
}

document.getElementById("startChat").addEventListener("click", () => {
    myRoomCode = document.getElementById("roomCodeInput").value.trim();
    myNickname = document.getElementById("nicknameInput").value.trim();

    if (!myRoomCode || !myNickname) {
        alert("Please enter a Room Code and Nickname.");
        return;
    }

    // Hide join screen and show chat
    document.getElementById("startChatContainer").classList.add("hidden");
    document.getElementById("chat-container").classList.remove("hidden");
    updateStatus('connected');

    connectToServer();
});

function connectToServer() {
    socket = io({
        transports: ['websocket'],
        auth: { roomCode: myRoomCode, nickname: myNickname }
    });

    socket.on("connect", () => {
        // Connected to server
        if (document.getElementById("groupChatToggle").checked) {
            socket.emit("unlock_capacity");
        }
    });

    socket.on("connect_error", (err) => {
        console.error("Connection Error:", err);
        updateStatus('disconnected');
    });

    socket.on("disconnect", () => {
        updateStatus('disconnected');
    });

    socket.on("error_msg", (msg) => {
        alert("Error: " + msg);
        window.location.reload();
    });

    socket.on("joined-room", ({ roomCode, capacity, existingPeers }) => {
        console.log(`Joined room ${roomCode} with capacity ${capacity}`);
        if (existingPeers.length > 0) {
            updateStatus('paired');
            document.getElementById("chat-box").innerHTML += `<p class="text-gray-500 text-xs italic">> Joined room with ${existingPeers.length} peer(s)</p>`;
        } else {
            document.getElementById("chat-box").innerHTML += `<p class="text-gray-500 text-xs italic">> Waiting for peers to join...</p>`;
        }
    });

    // When someone joins, initiate a connection with them
    socket.on("user-joined", async ({ partnerId, partnerNickname }) => {
        console.log(`User joined: ${partnerNickname} (${partnerId})`);
        updateStatus('paired');
        document.getElementById("chat-box").innerHTML += `<p class="text-green-500 text-xs italic">> ${partnerNickname} joined the room.</p>`;
        
        await createPeerConnection(partnerId, partnerNickname, true);
    });

    socket.on("offer", async ({ senderId, offer }) => {
        console.log(`Received offer from ${senderId}`);
        // If we don't have a peer connection yet, create one as the responder
        if (!peers[senderId]) {
            await createPeerConnection(senderId, "Peer", false);
        }
        
        const pc = peers[senderId].peerConnection;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { targetId: senderId, answer });
    });

    socket.on("answer", async ({ senderId, answer }) => {
        console.log(`Received answer from ${senderId}`);
        if (peers[senderId]) {
            await peers[senderId].peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    });

    socket.on("ice-candidate", async ({ senderId, candidate }) => {
        if (peers[senderId] && candidate) {
            try {
                await peers[senderId].peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error("Error adding ICE candidate:", error);
            }
        }
    });

    socket.on("peer-disconnected", ({ partnerId }) => {
        if (peers[partnerId]) {
            const name = peers[partnerId].nickname;
            document.getElementById("chat-box").innerHTML += `<p class="text-red-500 text-xs italic">> ${name} left the room.</p>`;
            
            peers[partnerId].peerConnection.close();
            delete peers[partnerId];

            // Remove video element if it exists
            const remoteVid = document.getElementById(`video-${partnerId}`);
            if (remoteVid) remoteVid.remove();

            if (Object.keys(peers).length === 0) {
                updateStatus('connected'); // Back to waiting
            }
        }
    });
}

async function createPeerConnection(partnerId, nickname, isInitiator) {
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    };
    const pc = new RTCPeerConnection(configuration);
    
    peers[partnerId] = { peerConnection: pc, dataChannel: null, nickname };

    // If local video is active, add tracks to the new peer
    if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    if (isInitiator) {
        const dc = pc.createDataChannel("chat");
        peers[partnerId].dataChannel = dc;
        setupDataChannel(partnerId);
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { targetId: partnerId, offer });
    } else {
        pc.ondatachannel = (event) => {
            peers[partnerId].dataChannel = event.channel;
            setupDataChannel(partnerId);
        };
    }

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", { targetId: partnerId, candidate: event.candidate });
        }
    };

    pc.ontrack = (event) => {
        // Create video element for this peer if it doesn't exist
        let remoteVid = document.getElementById(`video-${partnerId}`);
        if (!remoteVid) {
            remoteVid = document.createElement('video');
            remoteVid.id = `video-${partnerId}`;
            remoteVid.autoplay = true;
            remoteVid.className = "w-48 border border-blue-900/30 bg-black";
            document.getElementById("remoteVideos").appendChild(remoteVid);
            
            // Show video container if hidden
            document.querySelector(".videos").classList.remove("hidden");
            document.getElementById("startVideo").classList.add("hidden"); // Optional: hide button if video is already started
        }
        remoteVid.srcObject = event.streams[0];
    };
}

function setupDataChannel(partnerId) {
    const dc = peers[partnerId].dataChannel;
    dc.onopen = () => console.log(`✅ Data channel open with ${partnerId}!`);
    dc.onmessage = (event) => {
        let msg = event.data;
        try {
            msg = JSON.parse(event.data);
        } catch (e) {
            // Legacy fallback
        }
        displayMessage(peers[partnerId].nickname, msg);
        playRandomNotificationSound();
    };
}

// STEP 4: Chat Feature
function sendMessage() {
    let messageInput = document.getElementById("chat-input");
    let message = messageInput.value.trim();

    if (message) {
        const payload = {
            id: Date.now(),
            text: message,
            replyTo: replyingTo // object or null
        };

        // Broadcast to all active peers
        let sent = false;
        Object.values(peers).forEach(peer => {
            if (peer.dataChannel && peer.dataChannel.readyState === "open") {
                peer.dataChannel.send(JSON.stringify(payload));
                sent = true;
            }
        });

        if (sent) {
            displayMessage("You", payload);
            messageInput.value = "";
            cancelReply();
        } else {
            alert("No peers connected.");
        }
    }
}

function setReply(id, text, sender) {
    replyingTo = { id, text, sender };
    const preview = document.getElementById("reply-preview");
    const content = document.getElementById("reply-content");

    content.textContent = text;
    preview.classList.remove("hidden");
    document.getElementById("chat-input").focus();
}

function cancelReply() {
    replyingTo = null;
    document.getElementById("reply-preview").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (socket) socket.disconnect();
            window.location.reload();
        });
    }

    document.getElementById("cancelReply").addEventListener("click", cancelReply);
});

document.getElementById("sendMessage").addEventListener("click", sendMessage);
document.getElementById("chat-input").addEventListener("keypress", (event) => {
    if (event.key === "Enter") sendMessage();
});

function displayMessage(sender, data) {
    let messageText = "";
    let messageId = "";
    let replyData = null;

    if (typeof data === 'string') {
        messageText = data;
        messageId = Date.now();
    } else {
        messageText = data.text;
        messageId = data.id;
        replyData = data.replyTo;
    }

    let chatBox = document.getElementById("chat-box");
    let displaySender = sender === "You" ? "YOU" : sender.toUpperCase();

    const colorClass = sender === "You" ? "text-blue-400" : "text-green-400";

    let replyBlock = "";
    if (replyData) {
        replyBlock = `
            <div class="mb-1 ml-4 pl-2 border-l-2 border-gray-600 text-xs text-gray-500 italic">
                <span class="block text-[10px] font-bold uppercase mb-0.5 ${replyData.sender === "You" ? "text-blue-400" : "text-green-400"}">
                    ${replyData.sender === "You" ? "You" : replyData.sender}
                </span>
                ${replyData.text}
            </div>
        `;
    }

    const msgHtml = `
        <div class="mb-4 group" ondblclick="setReply(${messageId}, '${messageText.replace(/'/g, "\\'")}', '${sender}')">
            ${replyBlock}
            <div>
                <span class="${colorClass} font-bold text-xs tracking-wider cursor-pointer hover:underline" onclick="setReply(${messageId}, '${messageText.replace(/'/g, "\\'")}', '${sender}')" title="Click to Reply">
                    ${displaySender}:
                </span> 
                <span class="text-gray-300 text-sm font-light">${messageText}</span>
            </div>
        </div>
    `;

    chatBox.innerHTML += msgHtml;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// STEP 5: Video Call Feature
document.getElementById("startVideo").addEventListener("click", async () => {
    try {
        document.querySelector(".videos").classList.remove("hidden");
        document.getElementById("startVideo").classList.add("hidden");

        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById("localVideo").srcObject = localStream;

        // Add local stream to all existing peer connections
        Object.values(peers).forEach(peer => {
            if (peer.peerConnection) {
                localStream.getTracks().forEach(track => {
                    peer.peerConnection.addTrack(track, localStream);
                });
                
                // Renegotiation is required when adding a track after initial setup.
                // For a proper implementation, onnegotiationneeded should be handled,
                // but a simple approach is to create a new offer right away.
                // We'll trigger a manual renegotiation:
            }
        });
        
        // Manual renegotiation for all peers
        for (const partnerId in peers) {
            const pc = peers[partnerId].peerConnection;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("offer", { targetId: partnerId, offer });
        }
        
    } catch (error) {
        console.error("❌ Error accessing camera/microphone:", error);
    }
});

// 🔔 Random Notification Sound for Messages
const notificationSounds = [
    "/sounds/notification1.mp3", "/sounds/notification2.mp3", "/sounds/notification3.mp3",
    "/sounds/notification4.mp3", "/sounds/notification5.mp3", "/sounds/notification6.mp3",
    "/sounds/notification7.mp3", "/sounds/notification8.mp3", "/sounds/notification9.mp3",
    "/sounds/notification10.mp3", "/sounds/notification11.mp3", "/sounds/notification12.mp3",
    "/sounds/notification13.mp3", "/sounds/cid.mp3"
];

function playRandomNotificationSound() {
    const randomIndex = Math.floor(Math.random() * notificationSounds.length);
    const soundPath = notificationSounds[randomIndex];

    const audio = new Audio(soundPath);
    audio.play().catch(error => console.error("🔴 Audio play failed:", error));
}
