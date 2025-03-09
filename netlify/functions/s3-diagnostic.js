const AWS = require('aws-sdk');
require('dotenv').config();

exports.handler = async (event, context) => {
  console.log('Running S3 diagnostic check...');
  
  // Collect environment variable information
  const diagnosticInfo = {
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'not set',
      WIPLAYER_AWS_REGION: process.env.WIPLAYER_AWS_REGION || 'not set',
      AWS_REGION: process.env.AWS_REGION || 'not set',
      WIPLAYER_AWS_KEY_ID_EXISTS: !!process.env.WIPLAYER_AWS_KEY_ID,
      WIPLAYER_AWS_SECRET_EXISTS: !!process.env.WIPLAYER_AWS_SECRET,
      AWS_ACCESS_KEY_ID_EXISTS: !!process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY_EXISTS: !!process.env.AWS_SECRET_ACCESS_KEY
    },
    s3Connection: {
      status: 'unknown',
      error: null
    },
    bucketAccess: {
      status: 'unknown',
      error: null,
      contents: []
    }
  };
  
  // Configure AWS
  const awsConfig = {
    accessKeyId: process.env.WIPLAYER_AWS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.WIPLAYER_AWS_SECRET || process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.WIPLAYER_AWS_REGION || process.env.AWS_REGION || 'us-west-2'
  };
  
  try {
    // Initialize S3 client
    AWS.config.update(awsConfig);
    const s3 = new AWS.S3();
    diagnosticInfo.s3Connection.status = 'initialized';
    
    // Test S3 connection by listing buckets
    try {
      const listBucketsResponse = await s3.listBuckets().promise();
      diagnosticInfo.s3Connection.status = 'connected';
      diagnosticInfo.s3Connection.buckets = listBucketsResponse.Buckets.map(b => b.Name);
    } catch (listBucketsError) {
      diagnosticInfo.s3Connection.status = 'failed';
      diagnosticInfo.s3Connection.error = {
        code: listBucketsError.code,
        message: listBucketsError.message
      };
    }
    
    // Test bucket access by listing objects
    if (process.env.S3_BUCKET_NAME) {
      try {
        const listObjectsResponse = await s3.listObjectsV2({
          Bucket: process.env.S3_BUCKET_NAME,
          MaxKeys: 10
        }).promise();
        
        diagnosticInfo.bucketAccess.status = 'success';
        diagnosticInfo.bucketAccess.contents = listObjectsResponse.Contents.map(item => ({
          key: item.Key,
          size: item.Size,
          lastModified: item.LastModified
        }));
        
        // Test generating a signed URL for the first object
        if (listObjectsResponse.Contents.length > 0) {
          const testObject = listObjectsResponse.Contents[0];
          try {
            const signedUrl = s3.getSignedUrl('getObject', {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: testObject.Key,
              Expires: 60
            });
            
            diagnosticInfo.signedUrlTest = {
              status: 'success',
              objectKey: testObject.Key,
              urlStart: signedUrl.split('?')[0]
            };
          } catch (signedUrlError) {
            diagnosticInfo.signedUrlTest = {
              status: 'failed',
              objectKey: testObject.Key,
              error: {
                code: signedUrlError.code,
                message: signedUrlError.message
              }
            };
          }
        }
      } catch (listObjectsError) {
        diagnosticInfo.bucketAccess.status = 'failed';
        diagnosticInfo.bucketAccess.error = {
          code: listObjectsError.code,
          message: listObjectsError.message
        };
      }
    } else {
      diagnosticInfo.bucketAccess.status = 'skipped';
      diagnosticInfo.bucketAccess.error = {
        message: 'S3_BUCKET_NAME environment variable is not set'
      };
    }
  } catch (error) {
    diagnosticInfo.s3Connection.status = 'error';
    diagnosticInfo.s3Connection.error = {
      code: error.code,
      message: error.message
    };
  }
  
  // Return diagnostic information
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    },
    body: JSON.stringify(diagnosticInfo)
  };
};
