const socket = io("http://localhost:3000");

let assignedName = "";

// Receive assigned name from server  
socket.on("assigned-name", (name) => {
    assignedName = name;
    document.getElementById("username").innerText = `👤 Your Name: ${name}`;
});

// Handle re-rolls  
document.getElementById("reroll").addEventListener("click", () => {
    socket.emit("reroll-name");
});

// Show re-roll limit message  
socket.on("reroll-limit", (message) => {
    alert(message);
});

// Send message with assigned name  
document.getElementById("sendMessage").addEventListener("click", () => {
    let message = document.getElementById("chat-input").value;
    if (message) {
        socket.emit("chat-message", { sender: assignedName, text: message });
        document.getElementById("chat-box").innerHTML += `<p><b>You (${assignedName}):</b> ${message}</p>`;
    }
});

// Receive messages  
socket.on("chat-message", (data) => {
    document.getElementById("chat-box").innerHTML += `<p><b>${data.sender}:</b> ${data.text}</p>`;
});
