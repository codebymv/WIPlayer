#!/usr/bin/env node

/**
 * Netlify Environment Sync Script
 * 
 * This script helps sync your local .env variables to Netlify
 * by generating the commands you need to run.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Required environment variables for WIPlayer
const requiredVars = [
  'MONGODB_URI',
  'S3_BUCKET_NAME',
  'WIPLAYER_AWS_KEY_ID',
  'WIPLAYER_AWS_SECRET',
  'WIPLAYER_AWS_REGION'
];

// Alternative variable names that might be used locally
const alternativeVars = {
  'WIPLAYER_AWS_KEY_ID': 'AWS_ACCESS_KEY_ID',
  'WIPLAYER_AWS_SECRET': 'AWS_SECRET_ACCESS_KEY',
  'WIPLAYER_AWS_REGION': 'AWS_REGION'
};

// Load local .env file
const envPath = path.resolve(process.cwd(), '.env');
let localEnv = {};

try {
  if (fs.existsSync(envPath)) {
    localEnv = dotenv.parse(fs.readFileSync(envPath));
    console.log('✅ Local .env file loaded successfully');
  } else {
    console.warn('⚠️ No .env file found. Using environment variables from current process.');
    
    // Copy relevant environment variables from process.env
    [...requiredVars, ...Object.values(alternativeVars)].forEach(varName => {
      if (process.env[varName]) {
        localEnv[varName] = process.env[varName];
      }
    });
  }
} catch (error) {
  console.error('❌ Error loading .env file:', error.message);
  process.exit(1);
}

console.log('\n📋 Generating Netlify environment variable commands...');
console.log('\nRun these commands to sync your environment variables to Netlify:');
console.log('----------------------------------------------------------------');

// Generate commands for each required variable
requiredVars.forEach(varName => {
  let value = localEnv[varName];
  
  // If the primary variable isn't found, check for alternatives
  if (!value && alternativeVars[varName]) {
    const altVarName = alternativeVars[varName];
    value = localEnv[altVarName];
    
    if (value) {
      console.log(`# Using ${altVarName} as the value for ${varName}`);
    }
  }
  
  if (value) {
    // Mask sensitive values in the console output
    const maskedValue = maskValue(varName, value);
    console.log(`netlify env:set ${varName} "${maskedValue}" --scope all`);
    
    // Write the actual command to a batch file
    fs.appendFileSync(
      path.resolve(process.cwd(), 'sync-env.bat'),
      `netlify env:set ${varName} "${value}" --scope all\n`
    );
  } else {
    console.log(`# ⚠️ ${varName} not found in local environment`);
  }
});

console.log('\n✅ Commands have been generated and saved to sync-env.bat');
console.log('Run sync-env.bat to set all environment variables in Netlify');
console.log('\nNOTE: For security, the actual values are masked in the console output');
console.log('      but the correct values are in the batch file.');

// Helper function to mask sensitive values for display
function maskValue(name, value) {
  if (!value) return 'undefined';
  
  // Mask sensitive values
  if (name.includes('SECRET') || name.includes('KEY') || name.includes('PASSWORD') || 
      name.includes('URI') || name.includes('URL')) {
    if (value.length <= 8) {
      return '********';
    }
    return value.substring(0, 4) + '...' + value.substring(value.length - 4);
  }
  
  return value;
}
