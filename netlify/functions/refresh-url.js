const { getSignedUrl, objectExists } = require('./utils/s3');
require('dotenv').config();

exports.handler = async (event, context) => {
  // Extract the key from the path parameter
  const path = event.path;
  let key = path.replace('/.netlify/functions/refresh-url/', '');
  
  console.log(`Refreshing signed URL request for path: ${path}`);
  console.log(`Extracted key: ${key}`);
  console.log('S3 bucket name:', process.env.S3_BUCKET_NAME);
  console.log('AWS region:', process.env.WIPLAYER_AWS_REGION);
  console.log('AWS key exists:', !!process.env.WIPLAYER_AWS_KEY_ID);
  console.log('AWS secret exists:', !!process.env.WIPLAYER_AWS_SECRET);
  
  // Handle potential URL encoding in the path
  try {
    // Decode URL-encoded characters if present
    if (key.includes('%')) {
      key = decodeURIComponent(key);
      console.log(`Decoded key: ${key}`);
    }
  } catch (decodeError) {
    console.error('Error decoding URL:', decodeError);
    // Continue with the original key
  }
  
  // Extract just the filename from the path
  const filename = key.split('/').pop();
  console.log(`Extracted filename: ${filename}`);
  
  try {
    // Check if the file exists in S3 first
    console.log(`Checking if file exists in S3: ${filename}`);
    const fileExists = await objectExists(filename);
    console.log(`File exists in S3: ${fileExists}`);
    
    if (!fileExists) {
      console.error(`File not found in S3: ${filename}`);
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'File not found',
          message: `The requested file "${filename}" was not found in S3 bucket "${process.env.S3_BUCKET_NAME}".`,
          key: filename
        })
      };
    }
    
    // Generate a signed URL for the file with content-type header
    console.log(`Generating signed URL for file: ${filename}`);
    const signedUrl = await getSignedUrl(filename, 3600, {
      'ResponseContentType': 'audio/mpeg',
      'ResponseContentDisposition': 'inline'
    });
    
    // Log a masked version of the URL for debugging
    const maskedUrl = signedUrl ? 
      signedUrl.split('?')[0] + '?[SIGNATURE_PARAMS_REDACTED]' : 
      'undefined';
    console.log(`Generated signed URL (masked): ${maskedUrl}`);
    
    if (!signedUrl) {
      console.error(`Failed to generate signed URL for: ${filename}`);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Error generating signed URL',
          message: 'Failed to generate a signed URL for the requested file. Please check AWS credentials and S3 bucket configuration.',
          key: filename
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify({ 
        url: signedUrl,
        contentType: 'audio/mpeg',
        expiresIn: 3600
      })
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Error generating signed URL',
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      })
    };
  }
};
