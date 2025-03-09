/**
 * Shared AWS configuration for both the main application and Netlify functions
 */
require('dotenv').config();

// Detect environment
const isNetlifyProduction = process.env.NETLIFY && !process.env.NETLIFY_DEV;

// Use WIPLAYER_AWS_* variables first, fall back to standard AWS_* variables
const awsConfig = {
    accessKeyId: process.env.WIPLAYER_AWS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.WIPLAYER_AWS_SECRET || process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.WIPLAYER_AWS_REGION || process.env.AWS_REGION || 'us-west-2',
    bucketName: process.env.S3_BUCKET_NAME || 'wiplayer'
};

// Validate AWS configuration
function validateAwsConfig() {
    const missingVars = [];
    
    if (!awsConfig.accessKeyId) missingVars.push('WIPLAYER_AWS_KEY_ID/AWS_ACCESS_KEY_ID');
    if (!awsConfig.secretAccessKey) missingVars.push('WIPLAYER_AWS_SECRET/AWS_SECRET_ACCESS_KEY');
    if (!awsConfig.bucketName) missingVars.push('S3_BUCKET_NAME');
    
    if (missingVars.length > 0) {
        console.error(`Missing required AWS environment variables: ${missingVars.join(', ')}`);
        if (isNetlifyProduction) {
            console.error('Make sure these variables are set in your Netlify environment variables.');
        } else {
            console.error('Make sure these variables are set in your .env file.');
        }
        return false;
    }
    
    return true;
}

// Additional AWS options for Netlify production environment
const netlifyProductionOptions = {
    httpOptions: {
        timeout: 5000,
        connectTimeout: 5000
    },
    maxRetries: 3
};

module.exports = {
    awsConfig,
    isNetlifyProduction,
    netlifyProductionOptions,
    validateAwsConfig
};
