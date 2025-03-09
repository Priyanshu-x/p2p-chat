const socket = io("https://p2p-chat-12sl.onrender.com/", { transports: ['websocket'] });

let peerConnection;
let dataChannel;
let localStream;
let isInitiator = false;

// STEP 1: Wait for Pairing
socket.on("paired", async ({ partnerId, initiator }) => {
    console.log("🔗 Paired with:", partnerId);
    isInitiator = initiator;
    startConnection();
});

// STEP 2: Start WebRTC Connection
async function startConnection() {
    try {
        peerConnection = new RTCPeerConnection();

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
    if (candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error("❌ Error adding ICE candidate:", error);
        }
    }
});

// STEP 4: Chat Feature
function sendMessage() {
    let message = document.getElementById("chat-input").value.trim();
    if (message && dataChannel && dataChannel.readyState === "open") {
        console.log(`📨 Sending message as "YOU":`, message);
        
        dataChannel.send(message);
        displayMessage("You", message);
        document.getElementById("chat-input").value = "";
    }
}

// ✅ Ensure the button is properly clickable
document.addEventListener("DOMContentLoaded", () => {
    const startChatBtn = document.getElementById("startChat");
    const chatContainer = document.getElementById("chat-container");

    if (startChatBtn) {
        startChatBtn.addEventListener("click", () => {
            console.log("🚀 Start Chat button clicked!");
            chatContainer.style.display = "block"; // ✅ Ensure it's visible
        });
    } else {
        console.error("❌ Start Chat button not found!");
    }
});

document.getElementById("sendMessage").addEventListener("click", sendMessage);
document.getElementById("chat-input").addEventListener("keypress", (event) => {
    if (event.key === "Enter") sendMessage();
});

function displayMessage(sender, message) {
    let chatBox = document.getElementById("chat-box");
    let displaySender = sender === "You" ? "You" : "Peer";
    chatBox.innerHTML += `<p><b>${displaySender}:</b> ${message}</p>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Handle incoming messages
function setupDataChannel() {
    dataChannel.onopen = () => console.log("✅ Data channel open!");
    dataChannel.onmessage = (event) => {
        displayMessage("Peer", event.data);
        playRandomNotificationSound();
    };
}

// STEP 5: Video Call Feature
document.getElementById("startVideo").addEventListener("click", async () => {
    try {
        document.querySelector(".videos").style.display = "flex";

        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById("localVideo").srcObject = localStream;

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        socket.emit("video-call-started");
    } catch (error) {
        console.error("❌ Error accessing camera/microphone:", error);
    }
});

// Typing Indicator
document.getElementById("chat-input").addEventListener("input", () => {
    socket.emit("typing");
});

socket.on("typing", () => {
    let chatBox = document.getElementById("chat-box");
    let typingIndicator = document.getElementById("typing-indicator");

    if (!typingIndicator) {
        typingIndicator = document.createElement("p");
        typingIndicator.id = "typing-indicator";
        typingIndicator.innerText = `Peer is typing...`;
        chatBox.appendChild(typingIndicator);
    }

    clearTimeout(typingIndicator.timeout);
    typingIndicator.timeout = setTimeout(() => typingIndicator.remove(), 2000);
});

// 🔔 Random Notification Sound for Messages
const notificationSounds = [
    "/sounds/notification1.mp3", "/sounds/notification2.mp3", "/sounds/notification3.mp3",
    "/sounds/notification4.mp3", "/sounds/notification5.mp3", "/sounds/notification6.mp3",
    "/sounds/notification7.mp3", "/sounds/notification8.mp3", "/sounds/notification9.mp3",
    "/sounds/notification10.mp3", "/sounds/notification11.mp3", "/sounds/notification12.mp3",
    "/sounds/notification13.mp3", "/sounds/cid.mp3", "/sounds/yamate-kudasai.mp3"
];

function playRandomNotificationSound() {
    const randomIndex = Math.floor(Math.random() * notificationSounds.length);
    const soundPath = notificationSounds[randomIndex];

    const audio = new Audio(soundPath);
    audio.play().catch(error => console.error("🔴 Audio play failed:", error));
}
