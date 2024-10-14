const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  chatGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatGroup",
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  messageType: {
    type: String,
    enum: ["text", "file"], // Either 'text' or 'file'
    required: true,
  },
  content: {
    type: String, // Message text or base64 encoded file content
    required: function () {
      return this.messageType === "text";
    },
  },
  file: {
    data: Buffer, // Store file data (for file messages)
    contentType: String, // Store the file's MIME type
    fileName: String, // Store the original file name
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  seenBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
      seenAt: Date,
    },
  ],
  unseenBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
  ],
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
