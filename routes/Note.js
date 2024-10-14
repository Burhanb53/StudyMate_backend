const express = require("express");
const multer = require("multer");
const cors = require("cors");
const Note = require("../model/noteModel");
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to handle note upload
router.post(
  "/upload-note",
  upload.single("pdf"), // Only handle PDF upload
  async (req, res) => {
    try {
      const { title, description, tags } = req.body;
      const file = req.file; // Get the uploaded PDF file

      // Validate required fields
      if (!title || !description || !tags) {
        return res
          .status(400)
          .json({ message: "Title, description, and tags are required." });
      }

      let pdfPath = "";

      // Process PDF if provided
      if (file) {
        pdfPath = `data:${file.mimetype};base64,${file.buffer.toString(
          "base64"
        )}`;
      } else {
        return res.status(400).json({ message: "PDF file is required." });
      }

      const newNote = new Note({
        title,
        description,
        tags: tags.split(",").map((tag) => tag.trim()),
        pdf: pdfPath,
      });

      await newNote.save();

      res.status(200).json({ message: "Note uploaded successfully." });
    } catch (error) {
      console.error("Error uploading note:", error);
      res
        .status(500)
        .json({ message: "An error occurred while uploading the note." });
    }
  }
);


// Get all notes
router.get("/notes", async (req, res) => {
  try {
    const notes = await Note.find();
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notes." });
  }
});

// Edit Note
router.put("/edit-note/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags } = req.body;

    const updatedNote = await Note.findByIdAndUpdate(
      id,
      { title, description, tags },
      { new: true }
    );

    if (updatedNote) {
      res.status(200).json(updatedNote);
    } else {
      res.status(404).json({ error: "Note not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Error updating note" });
  }
});

// Delete Note
router.delete("/delete-note/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedNote = await Note.findByIdAndDelete(id);

    if (deletedNote) {
      res.status(200).json({ message: "Note deleted successfully" });
    } else {
      res.status(404).json({ error: "Note not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Error deleting note" });
  }
});

module.exports = router;
