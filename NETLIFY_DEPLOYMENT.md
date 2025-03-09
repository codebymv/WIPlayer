# WIPlayer Netlify Deployment Guide

This guide will help you deploy your full-stack WIPlayer application on Netlify, including the Express backend converted to serverless functions.

## Prerequisites

1. A Netlify account
2. Your MongoDB Atlas database (already set up)
3. Your AWS S3 bucket for audio storage (already set up)

## Deployment Steps

### 1. Install Netlify CLI (if not already done)

```bash
npm install netlify-cli -g
```

### 2. Login to Netlify from the CLI

```bash
netlify login
```

### 3. Initialize Netlify in your project

```bash
netlify init
```

Follow the prompts to either:
- Create a new site
- Connect to an existing site

### 4. Set up Environment Variables

In the Netlify dashboard:
1. Go to your site settings
2. Navigate to "Build & deploy" → "Environment"
3. Add the following environment variables:

```
MONGODB_URI=your_mongodb_connection_string
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-west-2
S3_BUCKET_NAME=wiplayer
```

### 5. Deploy Your Site

```bash
netlify deploy --prod
```

### 6. Test Your Deployment

After deployment, Netlify will provide a URL for your site. Visit this URL to ensure:
- The frontend loads correctly
- Songs are fetched from MongoDB via the serverless function
- Audio files stream correctly from S3

## Troubleshooting

### Function Execution Timeout

If your functions time out (especially when connecting to MongoDB), you may need to increase the function timeout in your `netlify.toml` file:

```toml
[functions]
  node_bundler = "esbuild"
  external_node_modules = ["mongoose"]
  timeout = 30
```

### CORS Issues

If you encounter CORS issues, ensure your S3 bucket has the correct CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"]
  }
]
```

### Connection Issues

If you have issues connecting to MongoDB, ensure your IP address is whitelisted in MongoDB Atlas.

## Maintenance

- **Logs**: View function logs in the Netlify dashboard under "Functions"
- **Updates**: When you make changes, simply run `netlify deploy --prod` again
- **Local Testing**: Use `netlify dev` to test locally before deploying

## Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
