require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS with credentials from .env
const credentials = new AWS.Credentials({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Test the credentials by making a simple API call
const sts = new AWS.STS({ credentials, region: process.env.AWS_REGION });

console.log('Attempting to verify AWS credentials...');
console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID);
console.log('Region:', process.env.AWS_REGION);

sts.getCallerIdentity({}, (err, data) => {
  if (err) {
    console.error('Error verifying credentials:', err.message);
    console.error('This suggests your credentials are invalid or expired.');
    return;
  }
  
  console.log('Credentials are valid!');
  console.log('Account ID:', data.Account);
  console.log('User ARN:', data.Arn);
  
  // Now test S3 access specifically
  const s3 = new AWS.S3({ credentials, region: process.env.AWS_REGION });
  const bucketName = process.env.S3_BUCKET_NAME;
  
  console.log(`\nTesting access to S3 bucket: ${bucketName}`);
  
  // Try to list buckets first (requires s3:ListAllMyBuckets permission)
  s3.listBuckets({}, (listErr, listData) => {
    if (listErr) {
      console.error('Error listing buckets:', listErr.message);
      console.error('This suggests your user lacks s3:ListAllMyBuckets permission.');
    } else {
      console.log('Successfully listed buckets:');
      const buckets = listData.Buckets.map(b => b.Name);
      console.log(buckets);
      
      // Check if our target bucket is in the list
      if (buckets.includes(bucketName)) {
        console.log(`✓ Bucket "${bucketName}" exists and is accessible`);
      } else {
        console.log(`✗ Bucket "${bucketName}" was not found in your account`);
        console.log('This suggests the bucket name might be incorrect or it belongs to another account');
      }
    }
    
    // Try to access the specific bucket
    s3.headBucket({ Bucket: bucketName }, (headErr) => {
      if (headErr) {
        console.error(`Error accessing bucket "${bucketName}":`, headErr.message);
        console.error('This suggests your user lacks permission to access this specific bucket');
      } else {
        console.log(`✓ Successfully accessed bucket "${bucketName}"`);
        
        // Try to list objects in the bucket
        s3.listObjectsV2({ Bucket: bucketName, MaxKeys: 5 }, (objErr, objData) => {
          if (objErr) {
            console.error('Error listing objects in bucket:', objErr.message);
            console.error('This suggests your user lacks s3:ListBucket permission on this bucket');
          } else {
            console.log(`✓ Successfully listed objects in bucket "${bucketName}"`);
            if (objData.Contents.length > 0) {
              console.log('First few objects:');
              objData.Contents.forEach(item => {
                console.log(`- ${item.Key} (${item.Size} bytes)`);
              });
            } else {
              console.log('Bucket is empty');
            }
          }
        });
      }
    });
  });
});
