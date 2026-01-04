// Check authentication first
fetch('/api/auth/status')
    .then(res => res.json())
    .then(data => {
        if (!data.authenticated) {
            window.location.href = '/login.html';
        }
    })
    .catch(() => window.location.href = '/login.html');

// socket is now auto-discovery (same domain)
const socket = io({
    transports: ['websocket']
});

let peerConnection;
let dataChannel;
let localStream;
let isInitiator = false;
let currentRoomId = null;

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

// Display connection status
socket.on("connect", () => {
    updateStatus('connected');
});

socket.on("connect_error", (err) => {
    console.error("Connection Error:", err);
    updateStatus('disconnected');
    if (err.message === "xhr poll error") return;
});

socket.on("disconnect", () => {
    updateStatus('disconnected');
});

// STEP 1: Wait for Pairing
socket.on("waiting", (data) => {
    console.log(data.message);
    updateStatus('connected');
    document.getElementById("chat-box").innerHTML += `<p class="text-gray-500 text-xs italic">> ${data.message}</p>`;
});

socket.on("paired", async ({ partnerId, initiator, roomId }) => {
    console.log("🔗 Paired with:", partnerId, "in room:", roomId);
    isInitiator = initiator;
    currentRoomId = roomId;

    updateStatus('paired');

    document.getElementById("chat-box").innerHTML = ""; // Clear waiting message
    startConnection();

    // Auto show chat container
    document.getElementById("chat-container").classList.remove("hidden");
    document.getElementById("startChatContainer").classList.add("hidden");
});

socket.on("peer-disconnected", () => {
    console.log("Peer disconnected");
    updateStatus('connected');
    alert("Peer disconnected. Reload to find a new peer.");
    peerConnection.close();
    location.reload();
});

// STEP 2: Start WebRTC Connection
async function startConnection() {
    try {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };
        peerConnection = new RTCPeerConnection(configuration);

        if (isInitiator) {
            dataChannel = peerConnection.createDataChannel("chat");
            setupDataChannel();
        } else {
            peerConnection.ondatachannel = (event) => {
                dataChannel = event.channel;
                setupDataChannel();
            };
        }

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", event.candidate);
            }
        };

        peerConnection.ontrack = (event) => {
            document.getElementById("remoteVideo").srcObject = event.streams[0];
        };

        if (isInitiator) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit("offer", offer);
        }
    } catch (error) {
        console.error("❌ Error in WebRTC setup:", error);
    }
}

// STEP 3: Handle WebRTC Signaling
socket.on("offer", async (offer) => {
    try {
        if (!peerConnection) startConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("answer", answer);
    } catch (error) {
        console.error("❌ Error handling offer:", error);
    }
});

socket.on("answer", async (answer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
        console.error("❌ Error handling answer:", error);
    }
});

socket.on("ice-candidate", async (candidate) => {
    if (candidate && peerConnection) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error("❌ Error adding ICE candidate:", error);
        }
    }
});

// STEP 4: Chat Feature
function sendMessage() {
    let messageInput = document.getElementById("chat-input");
    let message = messageInput.value.trim();

    if (message && dataChannel && dataChannel.readyState === "open") {
        const payload = {
            id: Date.now(),
            text: message,
            replyTo: replyingTo // object or null
        };

        console.log(`📨 Sending message:`, payload);

        dataChannel.send(JSON.stringify(payload)); // Send as JSON now
        displayMessage("You", payload);

        messageInput.value = "";
        cancelReply();
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

// ✅ Ensure the button is properly clickable
document.addEventListener("DOMContentLoaded", () => {
    const startChatBtn = document.getElementById("startChat");

    if (startChatBtn) {
        startChatBtn.addEventListener("click", () => {
            // console.log("Ready");
        });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login.html';
        });
    }

    document.getElementById("cancelReply").addEventListener("click", cancelReply);
});

document.getElementById("sendMessage").addEventListener("click", sendMessage);
document.getElementById("chat-input").addEventListener("keypress", (event) => {
    if (event.key === "Enter") sendMessage();
});

function displayMessage(sender, data) {
    // data can be string (old messages) or object (new format)
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
    let displaySender = sender === "You" ? "YOU" : "PEER"; // Uppercase for theme

    const colorClass = sender === "You" ? "text-blue-400" : "text-green-400";

    // Reply Block
    let replyBlock = "";
    if (replyData) {
        replyBlock = `
            <div class="mb-1 ml-4 pl-2 border-l-2 border-gray-600 text-xs text-gray-500 italic">
                <span class="block text-[10px] font-bold uppercase mb-0.5 ${replyData.sender === "You" ? "text-blue-400" : "text-green-400"}">
                    ${replyData.sender === "You" ? "You" : "Peer"}
                </span>
                ${replyData.text}
            </div>
        `;
    }

    // Message Block with Click to Reply
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

// Handle incoming messages
function setupDataChannel() {
    dataChannel.onopen = () => console.log("✅ Data channel open!");
    dataChannel.onmessage = (event) => {
        let msg = event.data;
        try {
            msg = JSON.parse(event.data);
        } catch (e) {
            // Legacy/Plain string fallback
        }
        displayMessage("Peer", msg);
        playRandomNotificationSound();
    };
}

// ... Video and Sound logic remains same ...

// STEP 5: Video Call Feature
document.getElementById("startVideo").addEventListener("click", async () => {
    try {
        document.querySelector(".videos").style.display = "flex";

        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById("localVideo").srcObject = localStream;

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
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
