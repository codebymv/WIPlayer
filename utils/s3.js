const AWS = require('aws-sdk');
const config = require('../config');

// Configure AWS with our centralized config
AWS.config.update({
    accessKeyId: config.aws.s3.accessKeyId,
    secretAccessKey: config.aws.s3.secretAccessKey,
    region: config.aws.s3.region
});

// Add additional configuration for Netlify production environment
if (config.isNetlifyProduction) {
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
        const keyToUse = filename || key;
        
        console.log(`Generating signed URL for: ${keyToUse}`);
        
        // Determine content type based on file extension
        const ext = keyToUse.split('.').pop().toLowerCase();
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
        
        console.log(`Using content type ${contentType} for file ${keyToUse}`);
        
        const params = {
            Bucket: bucketName,
            Key: keyToUse,
            Expires: expirationSeconds,
            ResponseContentType: additionalParams.ResponseContentType || contentType,
            ...additionalParams
        };
        
        const url = s3.getSignedUrl('getObject', params);
        return url;
    } catch (error) {
        console.error(`Error generating signed URL: ${error.message}`);
        return null;
    }
}

// Get a public URL for an object (for non-private objects)
function getPublicUrl(key) {
    if (!key) return null;
    
    // Make sure the key doesn't have a leading slash
    const cleanKey = key.startsWith('/') ? key.substring(1) : key;
    
    return `https://${bucketName}.s3.${config.aws.s3.region}.amazonaws.com/${cleanKey}`;
}

// Check if an object exists in the bucket
async function objectExists(key) {
    try {
        if (!key) {
            console.error('No key provided to objectExists');
            return false;
        }
        
        // Extract just the filename from the path
        const filename = key.split('/').pop();
        
        // Try different key formats to find the object
        const keyVariations = [
            key,                                 // Original key (e.g., musics/notime.mp3)
            key.startsWith('/') ? key.substring(1) : key,  // Remove leading slash
            filename,                            // Just the filename (e.g., notime.mp3)
            filename.includes(' ') ? filename.replace(/ /g, '%20') : filename // URL encode spaces
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
                console.log(` Object exists in S3: ${keyVariation}`);
                
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
