# WIPlayer: A Full-Stack Media Player for Music Streaming

An advanced music player application with dynamic audio visualization, cloud storage integration, and a responsive design for an engaging user experience.

**Link to project:** https://wpfs.netlify.app/

![](https://github.com/codebymv/WIPlayer/blob/main/images/wiplayer.gif)

## How It's Made:

**Tech used:** 
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Cloud Storage**: AWS S3
- **Development**: Nodemon

WIPlayer has evolved from a simple frontend concept into a full-stack application. The player features real-time audio visualization that responds to the music's frequency data, creating an immersive experience. The application now includes:

- **Cloud-exclusive audio storage** using AWS S3 with pre-signed URLs for secure access
- **Database integration** with MongoDB to store song metadata and user preferences
- **Dynamic color schemes** that adapt based on the artist/song
- **Responsive design** that works across different devices

## Features

- **Audio Visualization**: Real-time frequency analysis with customizable visual effects
- **Cloud Integration**: Secure audio streaming from AWS S3
- **Seek Bar**: Interactive timeline with visual progress indication
- **Volume Control**: Intuitive volume adjustment with visual feedback
- **Artist-based Theming**: Dynamic color schemes based on the current artist
- **Responsive Design**: Adapts to different screen sizes for optimal viewing

## Optimizations & Future Plans

The application continues to evolve with planned enhancements:

- **User Authentication**: Secure login and personalized experiences
- **Playlist Management**: Create, edit, and share playlists
- **Enhanced UI/UX**: More intuitive controls and visual feedback
- **Media Management**: Upload and organize your music library
- **Search Functionality**: Find songs quickly with powerful search
- **Real-time Features**: Collaborative listening sessions and social features

## Project Structure

The WIPlayer application follows a modular architecture designed for maintainability and scalability:

### Backend
- `/config` - Centralized configuration modules
  - `index.js` - Main configuration exports
  - `aws-config.js` - AWS S3 configuration
  - `mongodb-config.js` - MongoDB connection settings
- `/models` - MongoDB schema definitions
- `/netlify/functions` - Serverless functions for production deployment
  - `songs.js` - Fetch song metadata from MongoDB
  - `stream.js` - Generate pre-signed URLs for S3 audio streaming
  - `refresh-url.js` - Refresh expired S3 pre-signed URLs
  - `/models` - MongoDB schemas for Netlify functions
  - `/utils` - Utility functions for Netlify functions
- `/scripts` - Utility scripts for testing and deployment
  - `test-netlify-functions.js` - Test script for Netlify functions
  - `verify-credentials.js` - Verify AWS credentials and S3 access
- `/utils` - Shared utility functions
  - `s3.js` - AWS S3 utility functions
  - `response-helpers.js` - Standardized HTTP response helpers

### Frontend
- `/public` - Frontend assets and client-side code
  - `app.js` - Core application logic
  - `data.js` - Data management
  - `main.js` - UI initialization and event handling
  - `particlesystem.js` - Visualization effects
  - `style.css` - Application styling

## Deployment

The application is deployed on Netlify using serverless functions:

### Local Development
1. Install dependencies: `npm install`
2. Set up environment variables in a `.env` file (see Environment Variables section)
3. Run the Express server: `npm run dev`
4. For Netlify Functions development: `npm run netlify-dev`
5. Test Netlify functions: `npm run test-functions`
6. Verify AWS credentials: `node scripts/verify-credentials.js`

### Production Deployment
1. Configure environment variables in the Netlify dashboard:
   - `MONGODB_URI` - MongoDB connection string
   - `S3_BUCKET_NAME` - "wiplayer"
   - `WIPLAYER_AWS_KEY_ID` - AWS access key with S3 permissions
   - `WIPLAYER_AWS_SECRET` - AWS secret key
   - `WIPLAYER_AWS_REGION` - "us-west-2"
2. Run pre-deployment checks: `npm run predeploy`
3. Deploy to Netlify: `npm run deploy`

### Environment Variables

The application requires the following environment variables:

#### Local Development (.env file)
```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
WIPLAYER_AWS_KEY_ID=your_aws_access_key
WIPLAYER_AWS_SECRET=your_aws_secret_key
WIPLAYER_AWS_REGION=us-west-2
S3_BUCKET_NAME=wiplayer
```

#### Netlify Deployment (Netlify Dashboard)
Configure the same variables in the Netlify dashboard under Site Settings > Environment variables.

### Netlify Functions
The application uses the following serverless functions:
- `songs.js` - Fetches song data from MongoDB
- `stream.js` - Handles streaming audio files from AWS S3
- `refresh-url.js` - Refreshes S3 pre-signed URLs

## Setup and Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables:
   - Create a `.env` file with the following:
     ```
     PORT=3000
     MONGODB_URI=your_mongodb_connection_string
     AWS_ACCESS_KEY_ID=your_aws_access_key
     AWS_SECRET_ACCESS_KEY=your_aws_secret_key
     AWS_REGION=us-west-2
     S3_BUCKET_NAME=wiplayer
     ```
4. Upload your audio files to the AWS S3 bucket
5. Start the development server: `npm run dev`
6. Access the application at `http://localhost:3000`

## AWS S3 Configuration

The application requires proper AWS S3 setup:

1. Create an S3 bucket named "wiplayer" in the us-west-2 region
2. Create a dedicated IAM user with the following permissions:
   - s3:GetObject
   - s3:ListBucket
   - s3:HeadBucket
   - s3:HeadObject
3. Ensure these permissions are scoped to the "wiplayer" bucket
4. Configure CORS settings on your S3 bucket using the provided `s3-cors-config.json` file:
   ```bash
   aws s3api put-bucket-cors --bucket wiplayer --cors-configuration file://s3-cors-config.json
   ```
5. The CORS configuration should allow origins including localhost:8888 and wpfs.netlify.app

## Testing

The application includes test scripts to verify functionality:

1. Test Netlify functions: `npm run test-functions`
   - This tests the songs, stream, and refresh-url functions
   - Verifies MongoDB connection and AWS S3 access
   - Confirms that pre-signed URLs are generated correctly

2. Verify AWS credentials: `node scripts/verify-credentials.js`
   - Checks AWS credentials validity
   - Verifies S3 bucket access
   - Lists objects in the S3 bucket

## Lessons Learned:

This project has evolved from a simple frontend experiment to a comprehensive full-stack application. Key learnings include:

- Implementing cloud-exclusive media streaming with AWS S3
- Building responsive audio visualization with the Web Audio API
- Implementing secure access patterns for cloud resources
- Creating a seamless user experience with proper error handling
- Designing a modular architecture that allows for future expansion 
