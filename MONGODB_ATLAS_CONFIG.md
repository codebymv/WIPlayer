# MongoDB Atlas Configuration for Netlify Deployment

This guide explains how to configure MongoDB Atlas to work with your Netlify-deployed WIPlayer application.

## The Issue: IP Whitelist Restrictions

The error you're seeing in production is because MongoDB Atlas has IP whitelist restrictions. While your local development environment's IP is whitelisted, Netlify's serverless functions run on dynamic IP addresses that aren't in your whitelist.

## Solution 1: Allow Access from Anywhere (Recommended for Development)

For development and testing, the simplest solution is to allow connections from any IP address:

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Select your project
3. Go to "Network Access" in the left sidebar
4. Click "Add IP Address"
5. Click "Allow Access from Anywhere" (this adds `0.0.0.0/0`)
6. Add a comment like "Netlify Functions" for reference
7. Click "Confirm"

**Note:** This is convenient for development but less secure for production. For a production application with sensitive data, consider Solution 2.

## Solution 2: Use MongoDB Atlas Data API (More Secure)

For a more secure production setup:

1. Enable the MongoDB Atlas Data API:
   - Go to your Atlas cluster
   - Click "Data API" in the left sidebar
   - Enable the Data API
   - Create an API Key and save it securely

2. Update your Netlify function to use the Data API instead of direct MongoDB connection:
   - Install the required package: `npm install mongodb-data-api`
   - Modify your functions to use the Data API client instead of Mongoose

3. Update your environment variables:
   - Add `MONGODB_DATA_API_KEY` to your Netlify environment variables
   - Add `MONGODB_DATA_API_URL` to your Netlify environment variables

## Solution 3: Use Atlas Private Endpoint (Enterprise)

For enterprise applications:
1. Set up a VPC in AWS
2. Configure a Private Endpoint in MongoDB Atlas
3. Connect your Netlify site to your VPC using AWS PrivateLink

## Additional MongoDB Connection Options

We've already updated your `songs.js` file with additional connection options to make the MongoDB connection more resilient:

```javascript
const connection = await mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 10,
  directConnection: true,
  ssl: true,
  authSource: 'admin',
  retryReads: true
});
```

These options help with:
- Longer timeouts for serverless environments
- SSL connections for security
- Retry logic for better resilience
- Direct connections to bypass some networking issues

## Testing Your Connection

After making these changes:

1. Deploy your application again: `npm run deploy`
2. Check the MongoDB connection by accessing your songs endpoint:
   - https://wpfs.netlify.app/.netlify/functions/songs
3. Check the environment diagnostic endpoint:
   - https://wpfs.netlify.app/.netlify/functions/env-diagnostic

## Troubleshooting

If you still have issues:

1. Check Netlify function logs in the Netlify dashboard
2. Verify all environment variables are correctly set
3. Try temporarily disabling MongoDB Atlas authentication:
   - Create a new user with fewer restrictions
   - Update your connection string accordingly

Remember to revert any temporary security changes once your application is working properly in production.
