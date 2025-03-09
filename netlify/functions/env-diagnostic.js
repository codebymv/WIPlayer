// This function logs all environment variables and their values
// to help diagnose issues with environment variables in production
require('dotenv').config();

exports.handler = async (event, context) => {
  try {
    // Create an object to store safe versions of environment variables
    const envDiagnostics = {
      // AWS Configuration
      aws: {
        region: {
          WIPLAYER_AWS_REGION: process.env.WIPLAYER_AWS_REGION || 'not set',
          AWS_REGION: process.env.AWS_REGION || 'not set',
          region_used: process.env.WIPLAYER_AWS_REGION || process.env.AWS_REGION || 'none available'
        },
        credentials: {
          WIPLAYER_AWS_KEY_ID: process.env.WIPLAYER_AWS_KEY_ID ? 'set (masked)' : 'not set',
          AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'set (masked)' : 'not set',
          WIPLAYER_AWS_SECRET: process.env.WIPLAYER_AWS_SECRET ? 'set (masked)' : 'not set',
          AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'set (masked)' : 'not set',
          credentials_available: !!(process.env.WIPLAYER_AWS_KEY_ID || process.env.AWS_ACCESS_KEY_ID)
        },
        s3: {
          S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'not set'
        }
      },
      // MongoDB Configuration
      mongodb: {
        MONGODB_URI: process.env.MONGODB_URI ? 'set (masked)' : 'not set'
      },
      // Node Environment
      node: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        NETLIFY_DEV: process.env.NETLIFY_DEV || 'not set',
        CONTEXT: process.env.CONTEXT || 'not set'
      },
      // Request Context
      request: {
        path: event.path,
        httpMethod: event.httpMethod,
        headers: {
          host: event.headers.host,
          referer: event.headers.referer || 'not set',
          'user-agent': event.headers['user-agent']
        }
      }
    };

    // Test AWS SDK initialization
    let awsTest = 'Not tested';
    try {
      const AWS = require('aws-sdk');
      
      // Use WIPLAYER_AWS_* variables first, fall back to standard AWS_* variables
      const awsConfig = {
        accessKeyId: process.env.WIPLAYER_AWS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.WIPLAYER_AWS_SECRET || process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.WIPLAYER_AWS_REGION || process.env.AWS_REGION || 'us-west-2'
      };
      
      AWS.config.update(awsConfig);
      const s3 = new AWS.S3();
      
      // Test S3 connection by listing buckets
      const buckets = await s3.listBuckets().promise();
      awsTest = {
        success: true,
        bucketCount: buckets.Buckets.length,
        bucketNames: buckets.Buckets.map(b => b.Name)
      };
      
      // Test access to the specific bucket
      if (process.env.S3_BUCKET_NAME) {
        try {
          const bucketParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            MaxKeys: 1
          };
          const bucketObjects = await s3.listObjectsV2(bucketParams).promise();
          awsTest.bucketAccess = {
            success: true,
            objectCount: bucketObjects.KeyCount
          };
        } catch (bucketError) {
          awsTest.bucketAccess = {
            success: false,
            error: bucketError.message
          };
        }
      } else {
        awsTest.bucketAccess = {
          success: false,
          error: 'S3_BUCKET_NAME not set'
        };
      }
    } catch (error) {
      awsTest = {
        success: false,
        error: error.message
      };
    }
    
    // Add AWS test results to diagnostics
    envDiagnostics.awsTest = awsTest;
    
    // Return the diagnostic information
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(envDiagnostics, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Failed to generate environment diagnostics',
        message: error.message
      })
    };
  }
};
