// Simple function to check environment variables and connections
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
require('dotenv').config();

exports.handler = async function(event, context) {
  // Make sure we don't keep the connection alive between function invocations
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Mask sensitive information
  const maskValue = (value) => {
    if (!value) return 'undefined';
    if (value.includes('@')) {
      // For MongoDB URI
      return value.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    }
    // For API keys
    return value.substring(0, 4) + '...' + value.substring(value.length - 4);
  };

  // Get all environment variables
  const envVars = {
    // MongoDB
    MONGODB_URI: maskValue(process.env.MONGODB_URI),
    MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
    
    // AWS S3 - Custom names
    WIPLAYER_AWS_KEY_ID: !!process.env.WIPLAYER_AWS_KEY_ID,
    WIPLAYER_AWS_SECRET: !!process.env.WIPLAYER_AWS_SECRET,
    WIPLAYER_AWS_REGION: process.env.WIPLAYER_AWS_REGION,
    
    // Legacy AWS names (should not be used but checking if they exist)
    AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    
    // S3 Bucket
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    
    // Node environment
    NODE_ENV: process.env.NODE_ENV,
    
    // Netlify specific
    NETLIFY: process.env.NETLIFY,
    CONTEXT: process.env.CONTEXT,
    DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL
  };

  // Test MongoDB connection
  let mongoStatus = { connected: false, error: null };
  try {
    if (process.env.MONGODB_URI) {
      console.log('Testing MongoDB connection...');
      
      // Set mongoose options for serverless environment
      mongoose.set('strictQuery', false);
      
      // Connect with a short timeout
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      
      // Check if we can query the database
      const collections = await mongoose.connection.db.listCollections().toArray();
      mongoStatus = { 
        connected: true, 
        collections: collections.map(c => c.name),
        dbName: mongoose.connection.db.databaseName
      };
      
      // Close the connection
      await mongoose.connection.close();
    } else {
      mongoStatus.error = "MONGODB_URI environment variable is not defined";
    }
  } catch (error) {
    mongoStatus.error = `${error.name}: ${error.message}`;
    console.error('MongoDB connection test failed:', error);
  }

  // Test AWS S3 connection
  let s3Status = { connected: false, error: null };
  try {
    if (process.env.WIPLAYER_AWS_KEY_ID && process.env.WIPLAYER_AWS_SECRET && process.env.S3_BUCKET_NAME) {
      console.log('Testing AWS S3 connection...');
      
      // Configure AWS
      const awsConfig = {
        accessKeyId: process.env.WIPLAYER_AWS_KEY_ID,
        secretAccessKey: process.env.WIPLAYER_AWS_SECRET,
        region: process.env.WIPLAYER_AWS_REGION || 'us-west-2'
      };
      
      AWS.config.update(awsConfig);
      const s3 = new AWS.S3();
      
      // Try to list objects in the bucket
      const result = await s3.listObjectsV2({
        Bucket: process.env.S3_BUCKET_NAME,
        MaxKeys: 5
      }).promise();
      
      s3Status = {
        connected: true,
        bucketName: process.env.S3_BUCKET_NAME,
        region: process.env.WIPLAYER_AWS_REGION || 'us-west-2',
        objectCount: result.KeyCount,
        sampleObjects: result.Contents ? result.Contents.map(item => item.Key) : []
      };
    } else {
      s3Status.error = "Missing AWS credentials or bucket name";
    }
  } catch (error) {
    s3Status.error = `${error.name}: ${error.message}`;
    console.error('AWS S3 connection test failed:', error);
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      message: "Environment and connection check", 
      environment: envVars,
      mongodb: mongoStatus,
      s3: s3Status,
      timestamp: new Date().toISOString()
    })
  };
};
