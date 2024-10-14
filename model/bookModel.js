const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  tags: [{ type: String }],
  image: { type: String, required: true },
  pdf: { type: String, required: true },
});

const Book = mongoose.model("Book", bookSchema);

module.exports = Book;
