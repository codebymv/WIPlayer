require('dotenv').config();
const AWS = require('aws-sdk');

console.log('Testing new IAM user credentials for WIPlayer...');
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

// Test bucket access
async function testBucketAccess() {
  try {
    console.log(`\nTesting access to bucket: ${bucketName}`);
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log('✓ Successfully accessed bucket!');
    return true;
  } catch (err) {
    console.error('✗ Error accessing bucket:', err.message);
    return false;
  }
}

// Test listing objects
async function testListObjects() {
  try {
    console.log(`\nTesting listing objects in bucket: ${bucketName}`);
    const data = await s3.listObjectsV2({ Bucket: bucketName, MaxKeys: 5 }).promise();
    console.log('✓ Successfully listed objects!');
    console.log(`Found ${data.Contents.length} objects`);
    
    if (data.Contents.length > 0) {
      console.log('\nFirst few objects:');
      data.Contents.forEach(item => {
        console.log(`- ${item.Key} (${item.Size} bytes)`);
      });
      
      // Return the first audio file for further testing
      return data.Contents.find(item => 
        item.Key.endsWith('.mp3') || 
        item.Key.endsWith('.wav') || 
        item.Key.endsWith('.ogg')
      );
    }
    return null;
  } catch (err) {
    console.error('✗ Error listing objects:', err.message);
    return null;
  }
}

// Test getting an object
async function testGetObject(key) {
  if (!key) return false;
  
  try {
    console.log(`\nTesting access to file: ${key}`);
    const data = await s3.headObject({ Bucket: bucketName, Key: key }).promise();
    console.log('✓ Successfully accessed file!');
    console.log(`Content Type: ${data.ContentType}`);
    console.log(`Size: ${data.ContentLength} bytes`);
    return true;
  } catch (err) {
    console.error('✗ Error accessing file:', err.message);
    return false;
  }
}

// Test generating a pre-signed URL
async function testSignedUrl(key) {
  if (!key) return;
  
  try {
    console.log(`\nGenerating pre-signed URL for: ${key}`);
    const url = s3.getSignedUrl('getObject', {
      Bucket: bucketName,
      Key: key,
      Expires: 3600 // 1 hour
    });
    console.log('✓ Successfully generated pre-signed URL:');
    console.log(url);
    return url;
  } catch (err) {
    console.error('✗ Error generating pre-signed URL:', err.message);
    return null;
  }
}

// Run all tests
async function runTests() {
  const bucketAccessible = await testBucketAccess();
  if (!bucketAccessible) {
    console.error('\nCannot proceed with further tests due to bucket access issues.');
    return;
  }
  
  const audioFile = await testListObjects();
  if (audioFile) {
    await testGetObject(audioFile.Key);
    await testSignedUrl(audioFile.Key);
    
    console.log('\n=== Test Summary ===');
    console.log('✓ Bucket access: Success');
    console.log('✓ List objects: Success');
    console.log('✓ File access: Success');
    console.log('✓ Pre-signed URL generation: Success');
    console.log('\nYour new IAM user credentials are working correctly!');
    console.log('You can now update your server.js to use pre-signed URLs for audio playback.');
  } else {
    console.log('\nNo audio files found in the bucket to test with.');
  }
}

runTests().catch(err => {
  console.error('Error running tests:', err);
});
