const mongoose = require('mongoose');
const { getSignedUrl, objectExists, getObjectMetadata } = require('./utils/s3');
const { successResponse, errorResponse } = require('./utils/response-helpers');
const mongoConfig = require('../../config/mongodb-config');
const config = require('../../config');

// Import the Song model from the local models directory
const Song = require('./models/song');

// Connect to MongoDB
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('Using cached database connection');
    return cachedDb;
  }
  
  try {
    // Log the connection string (without credentials) for debugging
    const sanitizedUri = mongoConfig.getSanitizedUri();
    console.log(`Attempting to connect to MongoDB with URI: ${sanitizedUri}`);
    console.log('MongoDB URI exists:', !!mongoConfig.mongoDbUri);
    
    // Set mongoose options for serverless environment
    mongoose.set('strictQuery', false);
    
    // Check if MongoDB URI is defined
    if (!mongoConfig.mongoDbUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }
    
    console.log('Connecting to MongoDB...');
    
    // Disconnect if there's an existing connection in a bad state
    if (mongoose.connection.readyState !== 0) {
      console.log('Closing existing mongoose connection');
      await mongoose.connection.close();
    }
    
    console.log(`Environment: ${mongoConfig.isNetlifyProduction ? 'Netlify Production' : 'Local Development'}`);
    
    // Use the connection options from our config
    console.log('Using MongoDB connection options:', JSON.stringify(mongoConfig.connectionOptions));
    
    const connection = await mongoose.connect(mongoConfig.mongoDbUri, mongoConfig.connectionOptions);
    
    console.log('Successfully connected to MongoDB');
    cachedDb = connection;
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error information for IP whitelist issues
    if (error.message.includes('whitelist')) {
      console.error('IP whitelist error detected. This is likely because Netlify\'s IP addresses are not whitelisted in MongoDB Atlas.');
      console.error('To fix this, you need to allow access from anywhere (0.0.0.0/0) in your MongoDB Atlas Network Access settings.');
    }
    
    throw error;
  }
}

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
  } else {
    return {
      scheme: 'background-scheme-4',
      visualizer: 'rgb(200, 200, 200)'
    };
  }
}

exports.handler = async (event, context) => {
  // Make sure we don't keep the connection alive between function invocations
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Log environment variables (without sensitive data)
    console.log('Environment check:');
    console.log('- MONGODB_URI exists:', !!mongoConfig.mongoDbUri);
    console.log('- WIPLAYER_AWS_REGION:', config.awsRegion);
    console.log('- S3_BUCKET_NAME:', config.s3BucketName);
    
    // Connect to the database
    try {
      console.log('Attempting to connect to MongoDB...');
      await connectToDatabase();
      console.log('MongoDB connection successful');
    } catch (dbError) {
      console.error('MongoDB connection failed:', dbError);
      return errorResponse(500, 'Database connection failed', dbError);
    }
    
    console.log('Fetching songs from database...');
    let songs;
    try {
      songs = await Song.find({});
      console.log(`Found ${songs ? songs.length : 0} songs in database`);
    } catch (findError) {
      console.error('Error finding songs:', findError);
      return errorResponse(500, 'Error finding songs', findError);
    }
    
    if (!songs || songs.length === 0) {
      console.log('No songs found in database');
      return errorResponse(404, 'No songs found');
    }
    
    console.log('Processing songs for S3 streaming...');
    const songsWithS3Urls = songs.map(song => {
      const songObj = song.toObject();
      const colorInfo = calculateColorScheme(song);
      
      // Update the path to use the Netlify Functions streaming endpoint
      if (songObj.path) {
        // If it's using the old /api/stream/ format, update it
        if (songObj.path.startsWith('/api/stream/')) {
          songObj.path = songObj.path.replace('/api/stream/', '/.netlify/functions/stream/');
          console.log(`Converted API path to Netlify Functions path: ${songObj.path}`);
        } 
        // If it doesn't have any prefix, add the Netlify Functions prefix
        else if (!songObj.path.startsWith('/.netlify/functions/stream/')) {
          songObj.path = `/.netlify/functions/stream/${songObj.path}`;
          console.log(`Added Netlify Functions prefix to path: ${songObj.path}`);
        }
      } else {
        console.warn(`Song ${songObj.name} has no path defined`);
      }
      
      // Add color scheme information
      songObj.colorScheme = colorInfo.scheme;
      songObj.visualizerColor = colorInfo.visualizer;
      
      return songObj;
    });
    
    console.log(`Sending ${songsWithS3Urls.length} songs to client`);
    return successResponse(songsWithS3Urls);
  } catch (error) {
    console.error('Error fetching songs:', error);
    return errorResponse(500, 'Error fetching songs', error);
  }
};
