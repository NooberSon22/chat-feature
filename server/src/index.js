import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.CLIENT_URL],
  },
});

app.use(express.json());
app.use(cors());

const rooms = {};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", ({ roomId }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { users: [] }; // Initialize the room if it doesn't exist
    }
    socket.join(roomId);
    rooms[roomId].users.push(socket.id);
    console.log(`User with ID: ${socket.id} joined room: ${roomId}`);
  });

  socket.on("leave_room", ({ roomId }) => {
    socket.leave(roomId);
    if (rooms[roomId]) {
      const index = rooms[roomId].users.indexOf(socket.id);
      if (index !== -1) {
        rooms[roomId].users.splice(index, 1);
      }
      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId]; // Remove the room if no users are left
      }
    }
    console.log(`User with ID: ${socket.id} left room: ${roomId}`);
  });

  // Handle sending messages
  socket.on("send_message", (data) => {
    const { roomId, message } = data;
    if (roomId && rooms[roomId]) {
      socket.to(roomId).emit("receive_message", { message, roomId });
      console.log(`Message sent to room ${roomId}: ${message}`);
    } else {
      socket.broadcast.emit("receive_message", data); // This will send to everyone except the sender
    }
  });

  socket.on("typing", (data) => {
    const { roomId, message } = data;
    if (roomId && rooms[roomId]) {
      socket.to(roomId).emit("someone_typing", message.length > 0);
    } else {
      socket.broadcast.emit("someone_typing", message.length > 0);
    }
  });

  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((roomId) => {
      const room = rooms[roomId];
      const userIndex = room.users.indexOf(socket.id);
      if (userIndex !== -1) {
        room.users.splice(userIndex, 1);
        if (room.users.length === 0) {
          delete rooms[roomId]; // Remove the room if no users are left
        }
      }
    });
    console.log(`User Disconnected: ${socket.id}`);
  });
});

const initialize = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    httpServer.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
  }
};

initialize();
