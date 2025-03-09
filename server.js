require('dotenv').config();
const fs = require('fs'); // Add this line to import the fs module
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const { getSignedUrl, objectExists, getObjectStream, getObjectMetadata } = require('./utils/s3');
const Song = require('./models/songs'); // Ensure you have the correct Song model

const app = express();
const PORT = process.env.PORT || 3000;

// Add CORS headers for all responses
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    next();
});

// Parse JSON request bodies
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
    console.error('MongoDB connection error:', err);
});

// Function to calculate color scheme based on song attributes
function calculateColorScheme(song) {
    const artistName = song.artist.toLowerCase();
    
    // Define color schemes based on artist
    if (artistName.includes('carti')) {
        return {
            scheme: 'background-scheme-1',
            visualizer: 'rgb(255, 100, 100)'
        };
    } else if (artistName.includes('lucki')) {
        return {
            scheme: 'background-scheme-2',
            visualizer: 'rgb(100, 200, 255)'
        };
    } else if (artistName.includes('bladee')) {
        return {
            scheme: 'background-scheme-3',
            visualizer: 'rgb(100, 255, 150)'
        };
    } else if (artistName.includes('kanye') || artistName.includes('west')) {
        return {
            scheme: 'background-scheme-4',
            visualizer: 'rgb(200, 150, 255)'
        };
    } else {
        // Default scheme
        return {
            scheme: 'background-scheme-1',
            visualizer: 'rgb(200, 200, 200)'
        };
    }
}

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Add a specific route for image files (only for non-S3 images)
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Streaming endpoint for S3 audio files with range request support
app.get('/api/stream/:key(*)', async (req, res) => {
    try {
        const key = req.params.key;
        console.log(`Streaming request for: ${key}`);
        
        // Extract just the filename from the path
        const filename = key.split('/').pop();
        
        // Check if the file exists in S3
        const fileExists = await objectExists(filename);
        
        if (!fileExists) {
            console.error(`File not found in S3: ${filename}`);
            return res.status(404).send('File not found in S3');
        }
        
        try {
            // Get the metadata to determine content type and size
            const metadata = await getObjectMetadata(filename);
            const contentType = metadata.ContentType || 'audio/mpeg';
            const contentLength = metadata.ContentLength;
            
            console.log(`File metadata: Content-Type=${contentType}, Content-Length=${contentLength}`);
            
            // Set appropriate headers
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', contentLength);
            res.setHeader('Accept-Ranges', 'bytes');
            
            // Get the stream directly from S3
            const stream = await getObjectStream(filename);
            
            // Pipe the stream to the response
            console.log(`Streaming file directly from S3: ${filename}`);
            stream.pipe(res);
            
        } catch (streamError) {
            console.error('Error streaming from S3:', streamError);
            res.status(500).send('Error streaming from S3');
        }
    } catch (error) {
        console.error('Error in stream endpoint:', error);
        res.status(500).send('Server error');
    }
});

// Endpoint to refresh a signed URL
app.get('/api/refresh-url/:key(*)', async (req, res) => {
    try {
        const key = req.params.key;
        console.log(`Refreshing signed URL for: ${key}`);
        
        // Generate a new pre-signed URL
        const signedUrl = getSignedUrl(key, 86400); // 24 hours expiration
        if (!signedUrl) {
            return res.status(500).json({ error: 'Failed to generate signed URL' });
        }
        
        res.json({ url: signedUrl });
    } catch (err) {
        console.error('Error refreshing signed URL:', err);
        res.status(500).json({ error: 'Error refreshing signed URL' });
    }
});

// Endpoint to get all songs with S3 streaming URLs
app.get('/api/songs', async (req, res) => {
    try {
        console.log('Fetching songs from database...');
        const songs = await Song.find();
        console.log(`Found ${songs ? songs.length : 0} songs in database`);
        
        if (!songs || songs.length === 0) {
            console.error('No songs found in database');
            return res.status(404).json({ error: 'No songs found' });
        }
        
        console.log('Processing songs for S3 streaming...');
        const songsWithS3Urls = songs.map(song => {
            const songObj = song.toObject();
            const colorInfo = calculateColorScheme(song);
            
            // Update the path to use the streaming endpoint
            if (songObj.path && !songObj.path.startsWith('/api/stream/')) {
                songObj.path = `/api/stream/${songObj.path}`;
                console.log(`Converted path to: ${songObj.path}`);
            }
            
            // Update the cover path if it's an image
            if (songObj.cover && !songObj.cover.startsWith('/api/stream/') && !songObj.cover.includes('amazonaws.com')) {
                // For now, keep cover images as local paths
                // We could also stream these from S3 if needed
            }
            
            // Add color scheme information
            songObj.colorScheme = colorInfo.scheme;
            songObj.visualizerColor = colorInfo.visualizer;
            
            return songObj;
        });
        
        console.log(`Sending ${songsWithS3Urls.length} songs to client`);
        res.json(songsWithS3Urls);
    } catch (err) {
        console.error('Error fetching songs:', err);
        res.status(500).json({ error: 'Error fetching songs' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with nodemon auto-restart enabled...`);
});
