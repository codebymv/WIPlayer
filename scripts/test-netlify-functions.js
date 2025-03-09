/**
 * Test script for Netlify functions
 * 
 * This script tests the Netlify functions to ensure they work correctly
 * after the refactoring. It simulates requests to each function and
 * verifies the responses.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Song = require('../netlify/functions/models/song');

// Import the functions directly
const songsHandler = require('../netlify/functions/songs').handler;
const streamHandler = require('../netlify/functions/stream').handler;
const refreshUrlHandler = require('../netlify/functions/refresh-url').handler;

// Mock event and context objects for Netlify functions
const createMockEvent = (path, method = 'GET', queryParams = {}) => ({
  path,
  httpMethod: method,
  headers: {
    'content-type': 'application/json'
  },
  queryStringParameters: queryParams
});

const mockContext = {
  callbackWaitsForEmptyEventLoop: true
};

// Extract filename from path
function extractFilenameFromPath(path) {
  // Handle paths like "/.netlify/functions/stream/musics/song.mp3"
  if (path.startsWith('/.netlify/functions/stream/')) {
    return path.replace('/.netlify/functions/stream/', '');
  }
  return path;
}

// Test the songs function
async function testSongsFunction() {
  console.log('\n--- Testing songs function ---');
  try {
    const event = createMockEvent('/.netlify/functions/songs');
    const response = await songsHandler(event, mockContext);
    
    console.log(`Status code: ${response.statusCode}`);
    
    const body = JSON.parse(response.body);
    if (response.statusCode === 200) {
      console.log(`Found ${body.length} songs`);
      if (body.length > 0) {
        const firstSong = body[0];
        console.log('First song:', {
          title: firstSong.name,
          artist: firstSong.artist,
          path: firstSong.path,
          hasS3Url: !!firstSong.s3Url
        });
        
        // Extract the filename from the path
        const filename = extractFilenameFromPath(firstSong.path);
        console.log('Extracted filename:', filename);
        
        return { success: true, song: firstSong, filename };
      }
      return { success: true, song: null, filename: null };
    } else {
      console.log('Error:', body.error);
      return { success: false, song: null, filename: null };
    }
  } catch (error) {
    console.error('Error testing songs function:', error);
    return { success: false, song: null, filename: null };
  }
}

// Test the stream function
async function testStreamFunction(filename) {
  console.log('\n--- Testing stream function ---');
  
  if (!filename) {
    console.log('Cannot test stream function because no filename was provided');
    return false;
  }
  
  try {
    console.log(`Testing stream function with filename: ${filename}`);
    
    const event = createMockEvent(`/.netlify/functions/stream/${filename}`);
    const response = await streamHandler(event, mockContext);
    
    console.log(`Status code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('Stream URL generated successfully');
      console.log('URL starts with:', body.url.substring(0, 50) + '...');
    } else {
      try {
        const body = JSON.parse(response.body);
        console.log('Error:', body.error);
      } catch (e) {
        console.log('Error response body:', response.body);
      }
    }
    
    return response.statusCode === 200;
  } catch (error) {
    console.error('Error testing stream function:', error);
    return false;
  }
}

// Test the refresh-url function
async function testRefreshUrlFunction(filename) {
  console.log('\n--- Testing refresh-url function ---');
  
  if (!filename) {
    console.log('Cannot test refresh-url function because no filename was provided');
    return false;
  }
  
  try {
    console.log(`Testing refresh-url function with filename: ${filename}`);
    
    const event = createMockEvent(`/.netlify/functions/refresh-url/${filename}`);
    const response = await refreshUrlHandler(event, mockContext);
    
    console.log(`Status code: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      console.log('URL refreshed successfully');
      console.log('URL starts with:', body.url.substring(0, 50) + '...');
    } else {
      try {
        const body = JSON.parse(response.body);
        console.log('Error:', body.error);
      } catch (e) {
        console.log('Error response body:', response.body);
      }
    }
    
    return response.statusCode === 200;
  } catch (error) {
    console.error('Error testing refresh-url function:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== Starting Netlify Functions Tests ===');
  
  // Check if environment variables are set
  const mongoDbUri = process.env.MONGODB_URI;
  const s3BucketName = process.env.S3_BUCKET_NAME;
  const awsKeyId = process.env.WIPLAYER_AWS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.WIPLAYER_AWS_SECRET || process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.WIPLAYER_AWS_REGION || process.env.AWS_REGION;
  
  console.log('Environment variables check:');
  console.log('- MONGODB_URI:', mongoDbUri ? 'Set' : 'Not set');
  console.log('- S3_BUCKET_NAME:', s3BucketName || 'Not set');
  console.log('- AWS Key ID:', awsKeyId ? 'Set' : 'Not set');
  console.log('- AWS Secret:', awsSecret ? 'Set' : 'Not set');
  console.log('- AWS Region:', awsRegion || 'Not set');
  
  if (!mongoDbUri || !s3BucketName || !awsKeyId || !awsSecret || !awsRegion) {
    console.error('\nError: Some required environment variables are not set.');
    console.error('Please make sure all required environment variables are set in your .env file.');
    console.error('Required variables: MONGODB_URI, S3_BUCKET_NAME, WIPLAYER_AWS_KEY_ID, WIPLAYER_AWS_SECRET, WIPLAYER_AWS_REGION');
    return false;
  }
  
  const songsResult = await testSongsFunction();
  const streamResult = await testStreamFunction(songsResult.filename);
  const refreshUrlResult = await testRefreshUrlFunction(songsResult.filename);
  
  console.log('\n=== Test Results ===');
  console.log('Songs function:', songsResult.success ? 'PASSED' : 'FAILED');
  console.log('Stream function:', streamResult ? 'PASSED' : 'FAILED');
  console.log('Refresh URL function:', refreshUrlResult ? 'PASSED' : 'FAILED');
  
  const allPassed = songsResult.success && streamResult && refreshUrlResult;
  console.log('\nOverall result:', allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
  
  return allPassed;
}

// Run the tests
runTests()
  .then(result => {
    process.exit(result ? 0 : 1);
  })
  .catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
