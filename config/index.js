require('dotenv').config();

/**
 * Centralized configuration for the WIPlayer application
 * This module handles all environment variables and configuration settings
 */
const config = {
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10
    }
  },
  aws: {
    s3: {
      bucket: process.env.S3_BUCKET_NAME || 'wiplayer',
      region: process.env.WIPLAYER_AWS_REGION || process.env.AWS_REGION || 'us-west-2',
      accessKeyId: process.env.WIPLAYER_AWS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.WIPLAYER_AWS_SECRET || process.env.AWS_SECRET_ACCESS_KEY
    }
  },
  server: {
    port: process.env.PORT || 3000
  },
  isNetlifyProduction: process.env.NETLIFY && !process.env.NETLIFY_DEV
};

/**
 * Validates that all required environment variables are set
 * @returns {boolean} - True if all required variables are set
 */
const validateConfig = () => {
  const missingVars = [];
  
  if (!config.mongodb.uri) missingVars.push('MONGODB_URI');
  if (!config.aws.s3.accessKeyId) missingVars.push('WIPLAYER_AWS_KEY_ID/AWS_ACCESS_KEY_ID');
  if (!config.aws.s3.secretAccessKey) missingVars.push('WIPLAYER_AWS_SECRET/AWS_SECRET_ACCESS_KEY');
  if (!config.aws.s3.bucket) missingVars.push('S3_BUCKET_NAME');
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    if (config.isNetlifyProduction) {
      console.error('Make sure these variables are set in your Netlify environment variables.');
    } else {
      console.error('Make sure these variables are set in your .env file.');
    }
  }
  
  return missingVars.length === 0;
};

config.isValid = validateConfig();

module.exports = config;
