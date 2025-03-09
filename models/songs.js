const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
    name: { type: String, required: true },
    path: { type: String, required: true },
    artist: { type: String, required: true },
    cover: { type: String, required: true },
});

const Song = mongoose.model('Song', songSchema);
module.exports = Song;

