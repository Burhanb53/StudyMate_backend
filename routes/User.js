const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const Book = require("../model/bookModel");
const Note = require("../model/noteModel");
const User = require("../model/userModel");
const { JWT_SECRET } = require("../config/keys");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { phone, password } = req.body;

  try {
    // Check if user exists by phone number
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      // If user exists, check if the password is correct
      const isMatch = await bcrypt.compare(password, existingUser.password);
      if (isMatch) {
        // Generate JWT token
        const token = jwt.sign(
          { id: existingUser._id, username: existingUser.username },
          JWT_SECRET
        );

        return res.status(200).json({
          message: "Login successful",
          token,
          userId: existingUser._id,
          username: existingUser.username,
        });
      } else {
        // If password doesn't match, return error response
        return res.status(400).json({ message: "Invalid password" });
      }
    } else {
      // If user doesn't exist, check if a username is already taken
      const existingUsernames = await User.find().distinct("username");

      // Create a new account
      const hashedPassword = await bcrypt.hash(password, 10); // Directly pass salt rounds
      const newUser = new User({ phone, password: hashedPassword });
      await newUser.save();

      // Generate JWT token for new user
      const token = jwt.sign({ id: newUser._id, username: null }, JWT_SECRET);

      return res.status(201).json({
        message: "Account created",
        token,
        userId: newUser._id,
        existingUsernames, // Include the list of existing usernames
      });
    }
  } catch (error) {
    console.error("Server error:", error); // Log error details
    res.status(500).json({ message: "Server error" });
  }
});

// Route to check username availability
router.get("/check-username", async (req, res) => {
  const username = req.query.username;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const user = await User.findOne({ username });
    if (user) {
      return res.status(200).json({ exists: true });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    return res.status(500).json({ message: "An error occurred", error });
  }
});

// Update User Details after first login/registration
router.post("/update-details", async (req, res) => {
  const { userId, username, name, email, institute, course } = req.body;

  try {
    // Find the user by userId instead of token
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update user details
    user.username = username;
    user.name = name;
    user.email = email;
    user.institute = institute;
    user.course = course;

    await user.save();

    // Return updated user info
    res.status(200).json({
      message: "Details Updated",
      userId: user._id,
      username: user.username,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating user details", error });
  }
});

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (user) {
      res.status(200).json({
        username: user.username,
        email: user.email,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/store-download", async (req, res) => {
  const { Id, userId } = req.body;

  try {
    // Update the user document to add the downloaded note ID
    await User.findByIdAndUpdate(userId, {
      $addToSet: { downloads: Id }, // Use $addToSet to avoid duplicates
    });

    res.status(200).json({ message: "Note ID added to downloads." });
  } catch (error) {
    console.error("Error storing note ID:", error);
    res.status(500).json({ message: "An error occurred." });
  }
});

router.post("/add-bookmark", async (req, res) => {
  const { Id, userId } = req.body;

  try {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { bookmarks: Id }, // Add to bookmarks array
    });

    res.status(200).json({ message: "Note added to bookmarks." });
  } catch (error) {
    console.error("Error adding note to bookmarks:", error);
    res
      .status(500)
      .json({ message: "An error occurred while adding the bookmark." });
  }
});

router.get("/:userId/bookmarks", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ bookmarks: user.bookmarks }); // Return the bookmarks array
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

// Toggle bookmark for a note/document
router.post("/toggle-bookmark", async (req, res) => {
  const { id, userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const bookmarkIndex = user.bookmarks.indexOf(id);

    if (bookmarkIndex === -1) {
      // Add to bookmarks if not already bookmarked
      user.bookmarks.push(id);
    } else {
      // Remove from bookmarks if already bookmarked
      user.bookmarks.splice(bookmarkIndex, 1);
    }

    await user.save();

    res.status(200).json({
      message:
        bookmarkIndex === -1 ? "Added to bookmarks" : "Removed from bookmarks",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
});

router.get("/bookmarks/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Return all bookmark details
    res.json({ bookmarks: user.bookmarks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

router.post("/notes/fetch", async (req, res) => {
  const { ids } = req.body;

  try {
    const notes = await Note.find({ _id: { $in: ids } });
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

router.post("/books/fetch", async (req, res) => {
  const { ids } = req.body;

  try {
    const books = await Book.find({ _id: { $in: ids } });
    res.json(books);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

module.exports = router;
