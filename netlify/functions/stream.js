const { getSignedUrl, objectExists } = require('./utils/s3');
const { successResponse, errorResponse } = require('./utils/response-helpers');
const config = require('../../config');

exports.handler = async (event, context) => {
  // Extract the key from the path parameter
  const path = event.path;
  let key = path.replace('/.netlify/functions/stream/', '');
  
  console.log(`Stream request received for path: ${path}`);
  console.log(`Extracted key: ${key}`);
  
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
      return errorResponse(404, 'File not found', {
        message: `The requested file "${filename}" was not found in S3 bucket "${config.aws.s3.bucket}".`,
        key: filename
      });
    }
    
    // Generate a signed URL for the file with content-type header
    console.log(`Generating signed URL for: ${filename}`);
    const signedUrl = await getSignedUrl(filename, 3600, {
      'ResponseContentType': 'audio/mpeg',
      'ResponseContentDisposition': 'inline'
    });
    
    if (!signedUrl) {
      console.error(`Failed to generate signed URL for: ${filename}`);
      return errorResponse(500, 'Error generating signed URL', {
        message: `Could not generate a signed URL for "${filename}".`
      });
    }
    
    console.log(`Successfully generated signed URL for: ${filename}`);
    
    // Return the signed URL to the client
    return successResponse({ 
      url: signedUrl,
      contentType: 'audio/mpeg',
      expiresIn: 3600
    }, {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
  } catch (error) {
    console.error(`Error in stream function: ${error.message}`);
    return errorResponse(500, 'Server error', error);
  }
};
