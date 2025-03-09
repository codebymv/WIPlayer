/**
 * Shared MongoDB configuration for both the main application and Netlify functions
 */
require('dotenv').config();

// Detect environment
const isNetlifyProduction = process.env.NETLIFY && !process.env.NETLIFY_DEV;

// MongoDB connection options optimized for serverless environments
const connectionOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10
};

// Get MongoDB URI from environment variables
const mongoDbUri = process.env.MONGODB_URI;

// Validate MongoDB configuration
function validateMongoDbConfig() {
    if (!mongoDbUri) {
        console.error('Missing required environment variable: MONGODB_URI');
        if (isNetlifyProduction) {
            console.error('Make sure this variable is set in your Netlify environment variables.');
        } else {
            console.error('Make sure this variable is set in your .env file.');
        }
        return false;
    }
    
    return true;
}

// Get a sanitized version of the MongoDB URI for logging (without credentials)
function getSanitizedUri() {
    if (!mongoDbUri) return 'undefined';
    return mongoDbUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
}

module.exports = {
    mongoDbUri,
    connectionOptions,
    isNetlifyProduction,
    validateMongoDbConfig,
    getSanitizedUri
};
