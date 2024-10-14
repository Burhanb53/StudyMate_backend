const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const uploadBookRouter = require("./routes/Book");
const uploadUserRouter = require("./routes/User");
const uploadNoteRouter = require("./routes/Note");
const GroupChat = require("./routes/GroupChat");

// Load config files
const connectDB = require("./config/db");
const { JWT_SECRET } = require("./config/keys");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/book", uploadBookRouter);
app.use("/note", uploadNoteRouter);
app.use("/user", uploadUserRouter);
app.use("/GroupChat", GroupChat);

connectDB();

app.get("/", (req, res) => {
  res.json({ message: "Welcome to my API!" });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
