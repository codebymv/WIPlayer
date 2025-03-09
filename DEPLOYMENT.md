# WIPlayer Deployment Guide

This guide provides instructions for deploying the WIPlayer application to Netlify, ensuring that all environment variables and configurations are properly set up.

## Prerequisites

- Node.js and npm installed
- Netlify CLI installed (`npm install -g netlify-cli`)
- Netlify account with access to the WIPlayer project
- AWS account with S3 bucket "wiplayer" in us-west-2 region
- MongoDB Atlas account with a database for WIPlayer

## Environment Variables

The following environment variables are required for the application to function properly:

| Variable | Description | Required In |
|----------|-------------|-------------|
| `MONGODB_URI` | MongoDB connection string | Local & Netlify |
| `S3_BUCKET_NAME` | S3 bucket name (should be "wiplayer") | Local & Netlify |
| `WIPLAYER_AWS_KEY_ID` | AWS access key ID with S3 permissions | Local & Netlify |
| `WIPLAYER_AWS_SECRET` | AWS secret access key | Local & Netlify |
| `WIPLAYER_AWS_REGION` | AWS region (should be "us-west-2") | Local & Netlify |

## Deployment Steps

### 1. Validate Environment Variables

Before deploying, validate that your local environment variables match those in Netlify:

```bash
npm run validate-env
```

This script will:
- Compare your local `.env` file with Netlify environment variables
- Check for missing variables
- Verify that values match between environments
- Provide instructions for fixing any issues

### 2. Deploy to Netlify

Once environment variables are validated, deploy the application:

```bash
npm run deploy
```

This command will:
- Run the validation script again
- Build the application
- Deploy to Netlify

Alternatively, you can run the deployment steps manually:

```bash
# Validate environment variables
npm run validate-env

# Deploy to Netlify
netlify deploy --prod
```

### 3. Verify Deployment

After deployment, verify that the application is working correctly:

1. Open the deployed site (https://wpfs.netlify.app)
2. Check the S3 diagnostic endpoint: `/.netlify/functions/s3-diagnostic`
3. Test audio playback functionality

## Troubleshooting

### Audio Playback Issues

If audio files aren't playing correctly:

1. Check the browser console for errors
2. Verify S3 connectivity using the diagnostic endpoint
3. Ensure the S3 bucket has the correct CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:8888", "https://wpfs.netlify.app"],
    "ExposeHeaders": []
  }
]
```

### Environment Variable Issues

If environment variables aren't working correctly:

1. Verify they're set in the Netlify dashboard
2. Run `netlify env:list` to see current values
3. Update variables with `netlify env:set VARIABLE_NAME "value"`

### MongoDB Connection Issues

If the application can't connect to MongoDB:

1. Check the MongoDB Atlas dashboard for connection issues
2. Verify the connection string in Netlify environment variables
3. Ensure IP access is configured to allow connections from Netlify

## S3 Configuration

The application requires specific S3 permissions:

- `s3:GetObject`
- `s3:ListBucket`
- `s3:HeadBucket`
- `s3:HeadObject`

These permissions should be scoped to the "wiplayer" bucket in the us-west-2 region.

## Netlify Functions

The application uses the following Netlify functions:

- `songs.js` - Fetches song data from MongoDB
- `stream.js` - Generates signed URLs for audio files in S3
- `refresh-url.js` - Refreshes expired S3 signed URLs
- `s3-diagnostic.js` - Tests S3 connectivity and configuration

## Additional Resources

- [Netlify CLI Documentation](https://docs.netlify.com/cli/get-started/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/index.html)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
