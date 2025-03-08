const socket = io();
let peerConnection;
let dataChannel;
let localStream;
let isInitiator = false; // 🚨 New flag to decide who creates an offer

// STEP 1: Wait for Pairing
socket.on("paired", async ({ partnerId, initiator }) => {
    console.log("Paired with:", partnerId);
    isInitiator = initiator; // 🚀 Assign role based on server
    startConnection();
});

// STEP 2: Start WebRTC Connection
async function startConnection() {
    peerConnection = new RTCPeerConnection();

    // Handle Data Channel
    if (isInitiator) {
        dataChannel = peerConnection.createDataChannel("chat");
        dataChannel.onopen = () => console.log("Data channel open!");
        dataChannel.onmessage = (event) => displayMessage("Peer", event.data);
    } else {
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            dataChannel.onopen = () => console.log("Data channel open!");
            dataChannel.onmessage = (event) => displayMessage("Peer", event.data);
        };
    }

    // ICE Candidate Handling
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
        }
    };

    if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("offer", offer);
    }
}

// STEP 3: Handle WebRTC Signaling
socket.on("offer", async (offer) => {
    if (!peerConnection) startConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
});

socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", async (candidate) => {
    if (candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
});

// STEP 4: Chat Feature
document.getElementById("startChat").addEventListener("click", () => {
    document.getElementById("chat-container").style.display = "block";
});

document.getElementById("sendMessage").addEventListener("click", () => {
    let message = document.getElementById("chat-input").value;
    if (message && dataChannel.readyState === "open") {
        dataChannel.send(message);
        displayMessage("You", message);
        document.getElementById("chat-input").value = "";
    }
});

function displayMessage(sender, message) {
    let chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `<p><b>${sender}:</b> ${message}</p>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// STEP 5: Video Call
document.getElementById("startVideo").addEventListener("click", async () => {
    document.querySelector(".videos").style.display = "flex";

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = localStream;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    socket.emit("video-call-started");
});
