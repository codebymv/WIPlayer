# WIPlayer: A Full-Stack Media Player for Music Streaming

An advanced music player application with dynamic audio visualization, cloud storage integration, and a responsive design for an engaging user experience.

**Link to project:** https://wiplayer.netlify.app/

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
4. Configure CORS settings on your S3 bucket to allow access from your application domain

## Lessons Learned:

This project has evolved from a simple frontend experiment to a comprehensive full-stack application. Key learnings include:

- Implementing cloud-exclusive media streaming with AWS S3
- Building responsive audio visualization with the Web Audio API
- Implementing secure access patterns for cloud resources
- Creating a seamless user experience with proper error handling
- Designing a modular architecture that allows for future expansion 
