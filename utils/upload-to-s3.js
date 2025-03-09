require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET_NAME;

// Directory containing music files
const musicDir = path.join(__dirname, 'public', 'musics');
const imageDir = path.join(__dirname, 'public', 'images');

// Function to upload a file to S3
async function uploadFile(filePath, s3Key) {
    try {
        console.log(`Uploading ${filePath} to S3 as ${s3Key}...`);
        
        // Read file content
        const fileContent = fs.readFileSync(filePath);
        
        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream'; // default
        
        if (ext === '.mp3') {
            contentType = 'audio/mpeg';
        } else if (ext === '.wav') {
            contentType = 'audio/wav';
        } else if (ext === '.ogg') {
            contentType = 'audio/ogg';
        } else if (ext === '.jpg' || ext === '.jpeg') {
            contentType = 'image/jpeg';
        } else if (ext === '.png') {
            contentType = 'image/png';
        }
        
        // Set up S3 upload parameters
        const params = {
            Bucket: bucketName,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType
        };
        
        // Upload to S3
        const data = await s3.upload(params).promise();
        console.log(`✓ Successfully uploaded to ${data.Location}`);
        return data.Location;
    } catch (error) {
        console.error(`Error uploading ${filePath}:`, error);
        return null;
    }
}

// Function to upload all files in a directory to S3
async function uploadDirectory(directory, s3Prefix) {
    try {
        // Check if directory exists
        if (!fs.existsSync(directory)) {
            console.error(`Directory not found: ${directory}`);
            return [];
        }
        
        // Get all files in the directory
        const files = fs.readdirSync(directory);
        console.log(`Found ${files.length} files in ${directory}`);
        
        // Upload each file
        const uploadPromises = files.map(async (file) => {
            const filePath = path.join(directory, file);
            
            // Skip directories
            if (fs.statSync(filePath).isDirectory()) {
                console.log(`Skipping directory: ${filePath}`);
                return null;
            }
            
            // Create S3 key (path in S3)
            const s3Key = `${s3Prefix}/${file}`;
            
            // Upload file
            return await uploadFile(filePath, s3Key);
        });
        
        // Wait for all uploads to complete
        const results = await Promise.all(uploadPromises);
        
        // Filter out nulls (failed uploads)
        return results.filter(result => result !== null);
    } catch (error) {
        console.error(`Error uploading directory ${directory}:`, error);
        return [];
    }
}

// Main function to upload all files
async function uploadAllFiles() {
    console.log('Starting upload of all files to S3...');
    
    // Upload music files
    console.log('\nUploading music files...');
    const musicUrls = await uploadDirectory(musicDir, 'musics');
    console.log(`Uploaded ${musicUrls.length} music files to S3`);
    
    // Upload image files
    console.log('\nUploading image files...');
    const imageUrls = await uploadDirectory(imageDir, 'images');
    console.log(`Uploaded ${imageUrls.length} image files to S3`);
    
    console.log('\nAll uploads completed!');
}

// Run the upload
uploadAllFiles().catch(err => {
    console.error('Error in upload process:', err);
});
