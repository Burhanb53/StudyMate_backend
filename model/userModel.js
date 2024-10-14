const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  phone: {
    type: Number,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true, // Ensure password is hashed
  },
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+\@.+\..+/, "Please enter a valid email address"],
  },
  institute: String,
  course: String,
  bookmarks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: [],
    },
  ],
  downloads: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: [],
    },
  ],
  chatgroups: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatGroup",
      default: [],
    },
  ],
  notes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note",
      default: [],
    },
  ],
});

module.exports = mongoose.model("Student", studentSchema);
