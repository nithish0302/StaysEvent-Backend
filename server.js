// Force IPv4 DNS resolution — fixes querySrv ECONNREFUSED on Windows
// Must be the very first line before any network/DB calls
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const http = require("http");
const dotenv = require("dotenv");
const app = require("./app");
const connectDB = require("./config/db");
const { Server } = require("socket.io");

dotenv.config();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🔌 User connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

connectDB();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
