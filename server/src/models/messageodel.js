import { model, Schema } from "mongoose";

const MessageSchema = new Schema({
  content: {
    type: String,
    required: true,
  },
});

const MessageModel = model("Model", MessageSchema);

export default MessageModel;
