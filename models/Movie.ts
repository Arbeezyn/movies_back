import mongoose from "mongoose";

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  posterUrl: {
    type: String,
    required: true,
  },
  movieUrl: {
    type: String,
    required: true,
  },
});

export default mongoose.model("Movie", movieSchema);
