require('dotenv').config();
const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET_NAME;

// List all objects in the bucket
console.log('Attempting to list objects in bucket:', bucketName);
console.log('Using region:', process.env.AWS_REGION);

s3.listObjects({ Bucket: bucketName }, (err, data) => {
  if (err) {
    console.error('Error listing objects:', err);
    return;
  }
  
  console.log('Successfully listed objects:');
  data.Contents.forEach(item => {
    console.log(`- ${item.Key} (${item.Size} bytes)`);
    
    // Try to generate a pre-signed URL for each object
    const params = {
      Bucket: bucketName,
      Key: item.Key,
      Expires: 3600 // URL expires in 1 hour
    };
    
    const url = s3.getSignedUrl('getObject', params);
    console.log(`  Signed URL: ${url}`);
  });
  
  // Check bucket policy
  s3.getBucketPolicy({ Bucket: bucketName }, (policyErr, policyData) => {
    if (policyErr) {
      console.log('No bucket policy found or error retrieving policy:', policyErr.code);
    } else {
      console.log('Bucket policy:', policyData.Policy);
    }
    
    // Check bucket ACL
    s3.getBucketAcl({ Bucket: bucketName }, (aclErr, aclData) => {
      if (aclErr) {
        console.log('Error retrieving bucket ACL:', aclErr);
      } else {
        console.log('Bucket ACL:', JSON.stringify(aclData, null, 2));
      }
    });
  });
});
