# 🔒 P2P Secure Chat 
Live At : https://p2p-chat-x.onrender.com/ (Enjoy With #er)
A secure, private, and minimalist Peer-to-Peer (P2P) chat application built for confidentiality and performance.

## ✨ Key Features

### 🛡️ Security & Privacy
*   **End-to-End Privacy**: Uses WebRTC for direct P2P data transfer. Video and Chat data flows directly between users, not the server.
*   **Secure Authentication**: Full login system backed by **SQLite** and **bcrypt**. No anonymous lurking.
*   **Room-Based Architecture**: Users are dynamically paired in private isolated rooms (`socket.io` rooms). No broadcasting to the public lobby.
*   **Data Minimization**: The server only acts as a signaling relay. Chat history is not persisted on the server.

### 🎨 Modern Minimalist UI
*   **Theme**: **Clean Black & White**. High-contrast, professional aesthetics using **TailwindCSS v4**.
*   **Responsive**: Mobile-first design.
*   **Status Indicators**: Visual cues for connection state (🔴 Offline, 🟡 Waiting, 🟢 Paired).
*   **Smart Features**:
    *   **Reply System**: Click any user name or double-click a message to quote and reply.
    *   **Rich Notifications**: Random fun sound effects on new messages.

### ⚙️ Industry-Standard Engineering
*   **Containerized**: Fully Dockerized with `Dockerfile` and `docker-compose.yml`.
*   **Tested**: Integrated **Jest** testing suite for authentication logic.
*   **Configurable**: Environment variables managed via `.env`.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Priyanshu-x/p2p-chat.git
    cd p2p-chat
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment**
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    SESSION_SECRET=your_super_secret_key_here
    NODE_ENV=development
    ```

4.  **Build Styles** (Compiles TailwindCSS)
    ```bash
    npm run build:css
    ```

### Running the App

**Development Mode:**
```bash
npm start
```
Visit `http://localhost:3000`.

**Run Tests:**
```bash
npm test
```

---

## 🐳 Docker Deployment

For a consistent production environment, run with Docker:

```bash
docker compose up --build
```
The app will be available at `http://localhost:3000`.

---

## 🛠️ Tech Stack

*   **Frontend**: HTML5, Vanilla JS, TailwindCSS v4
*   **Backend**: Node.js, Express
*   **Real-time**: Socket.io, WebRTC (STUN/TURN ready)
*   **Database**: SQLite (via `connect-sqlite3`)
*   **Security**: Helmet, Rate-Limit, CSURF protection ready
*   **DevOps**: Docker, Jest

## 📡 Deployment Note

This application uses **WebSockets** (`Socket.io`).
*   **DO NOT DEPLOY TO VERCEL** (Serverless functions kill WebSocket connections).
*   **Recommended Platforms**: Render, Railway, Heroku, or any VPS (DigitalOcean/AWS EC2).

---

## 🤝 Contributing

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request
