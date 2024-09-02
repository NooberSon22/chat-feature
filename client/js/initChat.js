import selectElement from "./lib";
import { io } from "socket.io-client";
const socket = io(`ws://${import.meta.env.VITE_SERVER_URL}`);

const ROOMID = {
  None: null,
  CCS: 12345,
  COA: 54321,
  COB: 98765,
};

export default function initChat() {
  const messageList = selectElement("#message-list");
  const messageInput = selectElement("#message-input");
  const messageButton = selectElement("#message-button");
  const loader = selectElement("#loader");
  const receiveList = selectElement("#receive-list");
  const sendList = selectElement("#send-list");
  const tag = selectElement("#tag");
  let joinedRoom = null;

  const createMessageElement = (message, type) => {
    const li = document.createElement("li");
    // const styles = {
    //   send_message: {
    //     bgColor: "bg-blue-500",
    //     textColor: "text-white",
    //     alignment: "ml-auto",
    //   },
    //   receive_message: {
    //     bgColor: "bg-slate-200",
    //     textColor: "text-black",
    //     alignment: "mr-0",
    //   },
    // };

    //const { bgColor, textColor, alignment } = styles[type];
    // li.classList.add(
    //   textColor,
    //   bgColor,
    //   "rounded-md",
    //   "px-3",
    //   "py-2",
    //   "max-w-[15em]",
    //   "break-words",
    //   alignment
    // );
    li.classList.add(type === "send_message" ? "message" : "receive");
    li.textContent = message;
    console.log(li);

    return li;
  };

  const handleMessage = (data, type) => {
    const { roomId, message } = data;
    const li = createMessageElement(message, type);

    if (joinedRoom) {
      // If the user has joined a room and the message's room ID matches
      if (joinedRoom === roomId) {
        messageList.appendChild(li);
      } else {
        return; // Do nothing if the room ID doesn't match
      }
    } else {
      // If no room is joined (public chat)
      messageList.appendChild(li);
    }

    if (type === "send_message") {
      socket.emit("send_message", { roomId: joinedRoom, message });
      messageInput.value = "";
    }
  };

  const handleRoomChange = (list, isSending) => {
    const selectedValue = list.value;
    const roomId = ROOMID[selectedValue];

    if (selectedValue === "None") {
      tag.textContent = "";
      tag.style.display = "none";
      joinRoom(roomId, false);
    } else {
      tag.style.display = "block";
      tag.textContent = `${isSending ? "Sending" : "Receiving"} message ${
        isSending ? "to" : "as"
      } ${selectedValue}`;
      joinRoom(roomId, true);
    }

    joinedRoom = roomId;
    console.log(joinedRoom);
  };

  const joinRoom = (roomId, isJoining) => {
    if (joinedRoom) {
      socket.emit("leave_room", { roomId: joinedRoom });
      joinedRoom = null;
    }
    const action = isJoining ? "join_room" : "leave_room";
    socket.emit(action, { roomId });
  };

  const loaderToggleVisibility = (show) => {
    loader.style.display = show ? "grid" : "none";
  };

  messageButton.addEventListener("click", () => {
    if (messageInput.value)
      handleMessage(
        { roomId: joinedRoom, message: messageInput.value },
        "send_message"
      );
  });

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleMessage(
        { roomId: joinedRoom, message: messageInput.value },
        "send_message"
      );
    }
  });

  messageInput.addEventListener("input", () =>
    socket.emit("typing", { roomId: joinedRoom, message: messageInput.value })
  );

  receiveList.addEventListener("change", () => {
    handleRoomChange(receiveList, false);
  });

  sendList.addEventListener("change", () => {
    handleRoomChange(sendList, true);
  });

  socket.on("connect", () => console.log("connected to server"));
  socket.on("receive_message", (data) => {
    console.log("Received message:", data);
    handleMessage(data, "receive_message");
    loaderToggleVisibility(false);
  });
  socket.on("someone_typing", (show) => loaderToggleVisibility(show));
  socket.on("connect_error", (err) => console.error("Connection failed:", err));
  socket.on("disconnect", () => console.warn("Disconnected from server"));
}
