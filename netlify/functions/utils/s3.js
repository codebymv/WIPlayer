const AWS = require('aws-sdk');
const config = require('../../../config');

// Log AWS configuration details (without sensitive data)
console.log('AWS Configuration:');
console.log('- Using centralized AWS configuration');
console.log('- AWS region:', config.aws.s3.region);
console.log('- S3 bucket name:', config.aws.s3.bucket);

// Configure AWS with our centralized config
AWS.config.update({
    accessKeyId: config.aws.s3.accessKeyId,
    secretAccessKey: config.aws.s3.secretAccessKey,
    region: config.aws.s3.region
});

// Add additional configuration for Netlify production environment
if (config.isNetlifyProduction) {
    console.log('Adding Netlify production-specific AWS options');
    AWS.config.update({
        httpOptions: {
            timeout: 5000,
            connectTimeout: 5000
        },
        maxRetries: 3
    });
}

const s3 = new AWS.S3();
const bucketName = config.aws.s3.bucket;

// Get a signed URL for an S3 object
function getSignedUrl(key, expirationSeconds = 3600, additionalParams = {}) {
    try {
        // Extract just the filename if it's a path
        const filename = key.split('/').pop();
        
        // Try both the original key and just the filename
        const keyVariations = [
            filename,                            // Just the filename (e.g., notime.mp3)
            key,                                 // Original key (e.g., musics/notime.mp3)
            key.startsWith('/') ? key.substring(1) : key,  // Remove leading slash
            `musics/${filename}`,                // Try with musics/ prefix
            `music/${filename}`                  // Try with music/ prefix
        ];
        
        console.log(`Attempting to generate signed URL with these key variations:`, keyVariations);
        
        // Determine content type based on file extension
        const ext = filename.split('.').pop().toLowerCase();
        let contentType = 'application/octet-stream'; // default
        
        if (ext === 'mp3') {
            contentType = 'audio/mpeg';
        } else if (ext === 'wav') {
            contentType = 'audio/wav';
        } else if (ext === 'ogg') {
            contentType = 'audio/ogg';
        } else if (ext === 'jpg' || ext === 'jpeg') {
            contentType = 'image/jpeg';
        } else if (ext === 'png') {
            contentType = 'image/png';
        }
        
        // Try each key variation
        for (const keyToUse of keyVariations) {
            try {
                console.log(`Generating signed URL for: ${keyToUse}`);
                
                // Check if the object exists first
                const params = {
                    Bucket: bucketName,
                    Key: keyToUse
                };
                
                try {
                    // Check if the object exists before generating a URL
                    const headResult = s3.headObject(params).promise();
                    
                    // If we get here, the object exists, so generate the signed URL
                    const signedUrlParams = {
                        ...params,
                        Expires: expirationSeconds,
                        ...additionalParams
                    };
                    
                    const url = s3.getSignedUrl('getObject', signedUrlParams);
                    
                    if (url) {
                        console.log(`Successfully generated signed URL for: ${keyToUse}`);
                        return url;
                    }
                } catch (headError) {
                    // Object doesn't exist with this key, try the next variation
                    console.log(`Object doesn't exist with key: ${keyToUse}, trying next variation`);
                    continue;
                }
            } catch (error) {
                console.error(`Error generating signed URL for ${keyToUse}:`, error);
                // Continue to the next variation
            }
        }
        
        // If we get here, none of the variations worked
        console.error(`Failed to generate signed URL for any variation of: ${key}`);
        return null;
    } catch (error) {
        console.error('Error in getSignedUrl:', error);
        return null;
    }
}

// Get a public URL for an object (for non-private objects)
function getPublicUrl(key) {
    if (!key) return null;
    
    // Make sure the key doesn't have a leading slash
    const cleanKey = key.startsWith('/') ? key.substring(1) : key;
    
    // Ensure we're using the correct region (prioritize WIPLAYER_AWS_REGION)
    const region = config.aws.s3.region;
    console.log(`Using region for public URL: ${region}`);
    
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cleanKey}`;
}

// Check if an object exists in the bucket
async function objectExists(key) {
    try {
        if (!key) {
            console.error('No key provided to objectExists');
            return false;
        }
        
        // Ensure we have a valid bucket name
        if (!bucketName) {
            console.error('S3 bucket name is not defined');
            return false;
        }
        
        // Extract just the filename from the path
        const filename = key.split('/').pop();
        
        // Try different key formats to find the object
        const keyVariations = [
            key,                                 // Original key (e.g., musics/notime.mp3)
            key.startsWith('/') ? key.substring(1) : key,  // Remove leading slash
            filename,                            // Just the filename (e.g., notime.mp3)
            filename.includes(' ') ? filename.replace(/ /g, '%20') : filename, // URL encode spaces
            `musics/${filename}`,                // Try with musics/ prefix
            `music/${filename}`                  // Try with music/ prefix
        ];
        
        console.log(`Trying to find object in S3 with these key variations:`, keyVariations);
        
        // Try each key variation
        for (const keyVariation of keyVariations) {
            try {
                const params = {
                    Bucket: bucketName,
                    Key: keyVariation
                };
                
                console.log(`Checking if object exists in S3: ${keyVariation}`);
                await s3.headObject(params).promise();
                console.log(`Object exists in S3: ${keyVariation}`);
                
                // Store the successful key for later use
                if (keyVariation !== key) {
                    console.log(`Found object with different key: ${keyVariation} (original: ${key})`);
                }
                
                return true;
            } catch (err) {
                if (err.code === 'NotFound' || err.code === 'NoSuchKey') {
                    console.log(`Object does not exist with key: ${keyVariation}`);
                } else {
                    console.error(`Error checking key ${keyVariation}: ${err.code} - ${err.message}`);
                }
                // Continue to the next variation
            }
        }
        
        // If we get here, none of the variations worked
        console.error(`Object not found in S3 with any key variation for: ${key}`);
        return false;
    } catch (error) {
        console.error(`Error in objectExists: ${error.code} - ${error.message}`);
        return false;
    }
}

// Get an S3 object as a stream
async function getObjectStream(key) {
    try {
        // Extract just the filename if it's a path
        const filename = key.split('/').pop();
        
        // Try both the original key and just the filename
        const keyToUse = filename || key;
        
        console.log(`Getting S3 object stream for: ${keyToUse}`);
        
        const params = {
            Bucket: bucketName,
            Key: keyToUse
        };
        
        return s3.getObject(params).createReadStream();
    } catch (error) {
        console.error(`Error getting S3 object stream: ${error.message}`);
        throw error;
    }
}

// Get S3 object metadata
async function getObjectMetadata(key) {
    try {
        // Extract just the filename if it's a path
        const filename = key.split('/').pop();
        
        // Try both the original key and just the filename
        const keyToUse = filename || key;
        
        console.log(`Getting S3 object metadata for: ${keyToUse}`);
        
        const params = {
            Bucket: bucketName,
            Key: keyToUse
        };
        
        const data = await s3.headObject(params).promise();
        return data;
    } catch (error) {
        console.error(`Error getting S3 object metadata: ${error.message}`);
        throw error;
    }
}

module.exports = {
    s3,
    bucketName,
    getSignedUrl,
    getPublicUrl,
    objectExists,
    getObjectStream,
    getObjectMetadata
};
