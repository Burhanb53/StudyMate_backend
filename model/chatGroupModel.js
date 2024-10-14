const mongoose = require("mongoose");

const chatGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // Group name
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student", // Reference to students (members)
      required: true,
    },
  ],
  admins: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student", // Reference to users who are admins
      required: true,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set creation time
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatMessage", // Reference to the last message for easy retrieval
  },
});

const ChatGroup = mongoose.model("ChatGroup", chatGroupSchema);

module.exports = ChatGroup;
