require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Log environment variables (without sensitive values)
console.log('Environment variables:');
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✓ Set' : '✗ Not set');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Not set');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET_NAME;

// Test specific file access
const testFiles = [
  'musics/carnivalflip.mp3',
  'musics/degen.mp3',
  'musics/notime.mp3'
];

// Function to test head object (check if file exists)
async function testHeadObject(key) {
  try {
    console.log(`\nTesting HEAD for ${key}...`);
    const params = { Bucket: bucketName, Key: key };
    const data = await s3.headObject(params).promise();
    console.log(`✓ File exists: ${key}`);
    console.log(`  Content Type: ${data.ContentType}`);
    console.log(`  Size: ${data.ContentLength} bytes`);
    console.log(`  Last Modified: ${data.LastModified}`);
    return true;
  } catch (err) {
    console.log(`✗ Error checking file ${key}: ${err.code} - ${err.message}`);
    return false;
  }
}

// Function to test get object (download file)
async function testGetObject(key) {
  try {
    console.log(`\nTesting GET for ${key}...`);
    const params = { Bucket: bucketName, Key: key };
    const data = await s3.getObject(params).promise();
    console.log(`✓ Successfully retrieved file: ${key}`);
    console.log(`  Content Type: ${data.ContentType}`);
    console.log(`  Size: ${data.ContentLength} bytes`);
    return true;
  } catch (err) {
    console.log(`✗ Error downloading file ${key}: ${err.code} - ${err.message}`);
    return false;
  }
}

// Function to test signed URL
async function testSignedUrl(key) {
  try {
    console.log(`\nTesting signed URL for ${key}...`);
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 3600 // URL expires in 1 hour
    };
    
    const url = s3.getSignedUrl('getObject', params);
    console.log(`✓ Generated signed URL: ${url}`);
    
    // Test if the URL is accessible via HTTP
    console.log(`  Note: You'll need to manually test this URL in a browser`);
    return url;
  } catch (err) {
    console.log(`✗ Error generating signed URL for ${key}: ${err.code} - ${err.message}`);
    return null;
  }
}

// Function to test bucket policy
async function testBucketPolicy() {
  try {
    console.log('\nTesting bucket policy...');
    const data = await s3.getBucketPolicy({ Bucket: bucketName }).promise();
    console.log('✓ Bucket policy:');
    console.log(JSON.parse(data.Policy));
    return data.Policy;
  } catch (err) {
    console.log(`✗ Error retrieving bucket policy: ${err.code} - ${err.message}`);
    if (err.code === 'NoSuchBucketPolicy') {
      console.log('  Note: No bucket policy is set. This might be why public access is denied.');
    }
    return null;
  }
}

// Function to test bucket ACL
async function testBucketAcl() {
  try {
    console.log('\nTesting bucket ACL...');
    const data = await s3.getBucketAcl({ Bucket: bucketName }).promise();
    console.log('✓ Bucket ACL:');
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.log(`✗ Error retrieving bucket ACL: ${err.code} - ${err.message}`);
    return null;
  }
}

// Function to test bucket CORS
async function testBucketCors() {
  try {
    console.log('\nTesting bucket CORS configuration...');
    const data = await s3.getBucketCors({ Bucket: bucketName }).promise();
    console.log('✓ Bucket CORS:');
    console.log(JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.log(`✗ Error retrieving bucket CORS: ${err.code} - ${err.message}`);
    if (err.code === 'NoSuchCORSConfiguration') {
      console.log('  Note: No CORS configuration is set. This might cause browser issues.');
    }
    return null;
  }
}

// Function to test bucket public access block
async function testPublicAccessBlock() {
  try {
    console.log('\nTesting bucket public access block settings...');
    const data = await s3.getPublicAccessBlock({ Bucket: bucketName }).promise();
    console.log('✓ Public access block settings:');
    console.log(JSON.stringify(data.PublicAccessBlockConfiguration, null, 2));
    
    if (data.PublicAccessBlockConfiguration.BlockPublicAcls ||
        data.PublicAccessBlockConfiguration.BlockPublicPolicy ||
        data.PublicAccessBlockConfiguration.IgnorePublicAcls ||
        data.PublicAccessBlockConfiguration.RestrictPublicBuckets) {
      console.log('  Note: Public access is blocked. This is why your files are not accessible.');
    }
    
    return data;
  } catch (err) {
    console.log(`✗ Error retrieving public access block: ${err.code} - ${err.message}`);
    return null;
  }
}

// Main function to run all tests
async function runTests() {
  console.log(`\n=== S3 Bucket Diagnostics for ${bucketName} ===\n`);
  
  // Test bucket existence
  try {
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log(`✓ Bucket exists: ${bucketName}`);
  } catch (err) {
    console.log(`✗ Error accessing bucket: ${err.code} - ${err.message}`);
    console.log('Aborting further tests...');
    return;
  }
  
  // Test file access
  for (const file of testFiles) {
    const exists = await testHeadObject(file);
    if (exists) {
      await testGetObject(file);
      await testSignedUrl(file);
    }
  }
  
  // Test bucket configuration
  await testBucketPolicy();
  await testBucketAcl();
  await testBucketCors();
  await testPublicAccessBlock();
  
  console.log('\n=== Diagnostics Complete ===');
  console.log('\nRecommendations:');
  console.log('1. If public access is blocked, you need to update your bucket settings');
  console.log('2. If CORS is not configured, add a CORS policy to allow browser access');
  console.log('3. Consider using pre-signed URLs for secure access to private files');
}

// Run all tests
runTests().catch(err => {
  console.error('Error running tests:', err);
});
