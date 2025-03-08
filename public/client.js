const socket = io();
let peerConnection;
let dataChannel;
let localStream;

// Step 1: Start Chat First
document.getElementById("startChat").addEventListener("click", async () => {
    document.getElementById("chat-container").style.display = "block";

    peerConnection = new RTCPeerConnection();

    // Open data channel for messaging
    dataChannel = peerConnection.createDataChannel("chat");
    
    dataChannel.onopen = () => console.log("Data channel open!");
    
    dataChannel.onmessage = (event) => {
        let chatBox = document.getElementById("chat-box");
        chatBox.innerHTML += `<p><b>Peer:</b> ${event.data}</p>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);

    document.getElementById("startVideo").style.display = "block";
});

// Step 2: Send Chat Messages
document.getElementById("sendMessage").addEventListener("click", () => {
    let message = document.getElementById("chat-input").value;
    if (message && dataChannel.readyState === "open") {
        dataChannel.send(message);
        displayMessage("You", message);
        document.getElementById("chat-input").value = "";
    }
});

// Function to display messages in chat UI
function displayMessage(sender, message) {
    let chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `<p><b>${sender}:</b> ${message}</p>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Step 3: Start Video After Chat is Established
document.getElementById("startVideo").addEventListener("click", async () => {
    document.querySelector(".videos").style.display = "flex";

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("localVideo").srcObject = localStream;

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    socket.emit("video-call-started");
});

// Handle Incoming Peer Connection Events
socket.on("offer", async (offer) => {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection();

        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            dataChannel.onopen = () => console.log("Data channel open on receiver side!");

            dataChannel.onmessage = (event) => {
                displayMessage("Peer", event.data);
            };
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", event.candidate);
            }
        };
    }

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
