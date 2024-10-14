const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const Book = require("../model/bookModel"); 
const router = express.Router();

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Route to handle book upload
router.post(
  "/upload-book",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, tags } = req.body;
      const { image, pdf } = req.files || {};

      // Validate required fields
      if (!title || !tags) {
        return res
          .status(400)
          .json({ message: "Title and tags are required." });
      }

      let imagePath = "";
      let pdfPath = "";

      // Process image
      if (image) {
        imagePath = `data:${
          image[0].mimetype
        };base64,${image[0].buffer.toString("base64")}`;
      }

      // Process PDF
      if (pdf) {
        pdfPath = `data:${pdf[0].mimetype};base64,${pdf[0].buffer.toString(
          "base64"
        )}`;
      }

      const newBook = new Book({
        title,
        tags: tags.split(",").map((tag) => tag.trim()),
        image: imagePath,
        pdf: pdfPath,
      });

      await newBook.save();

      res.status(200).json({ message: "Book uploaded successfully." });
    } catch (error) {
      console.error("Error uploading book:", error);
      res
        .status(500)
        .json({ message: "An error occurred while uploading the book." });
    }
  }
);

router.get("/books", async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch books." });
  }
});

// Edit Book
router.put("/edit-book/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, tags } = req.body;

    const updatedBook = await Book.findByIdAndUpdate(
      id,
      { title, tags },
      { new: true }
    );

    if (updatedBook) {
      res.status(200).json(updatedBook);
    } else {
      res.status(404).json({ error: "Book not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Error updating book" });
  }
});

// Delete Book
router.delete("/delete-book/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBook = await Book.findByIdAndDelete(id);

    if (deletedBook) {
      res.status(200).json({ message: "Book deleted successfully" });
    } else {
      res.status(404).json({ error: "Book not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Error deleting book" });
  }
});

module.exports = router;
