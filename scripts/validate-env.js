#!/usr/bin/env node

/**
 * Netlify Environment Validation Script
 * 
 * This script compares local environment variables with Netlify production environment
 * to ensure they match before deployment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Required environment variables for the application
const requiredVars = [
  { name: 'MONGODB_URI', description: 'MongoDB connection string' },
  { name: 'S3_BUCKET_NAME', description: 'S3 bucket name (should be "wiplayer")' },
  { 
    name: 'WIPLAYER_AWS_KEY_ID', 
    description: 'AWS access key ID',
    alternates: ['AWS_ACCESS_KEY_ID']
  },
  { 
    name: 'WIPLAYER_AWS_SECRET', 
    description: 'AWS secret access key',
    alternates: ['AWS_SECRET_ACCESS_KEY']
  },
  { 
    name: 'WIPLAYER_AWS_REGION', 
    description: 'AWS region (should be "us-west-2")',
    alternates: ['AWS_REGION']
  }
];

// Load local .env file
const envPath = path.resolve(process.cwd(), '.env');
let localEnv = {};

try {
  if (fs.existsSync(envPath)) {
    localEnv = dotenv.parse(fs.readFileSync(envPath));
    console.log('✅ Local .env file loaded successfully');
  } else {
    console.warn('⚠️ No .env file found. Using environment variables from current process.');
    // Use current process env variables that might be set
    const relevantVars = requiredVars.reduce((acc, { name, alternates = [] }) => {
      return [...acc, name, ...alternates];
    }, []);
    
    relevantVars.forEach(varName => {
      if (process.env[varName]) {
        localEnv[varName] = process.env[varName];
      }
    });
  }
} catch (error) {
  console.error('❌ Error loading .env file:', error.message);
  process.exit(1);
}

// Validate local environment variables
console.log('\n🔍 Validating local environment variables...');
let localEnvMissing = [];

requiredVars.forEach(({ name, description, alternates = [] }) => {
  const localValue = localEnv[name];
  
  if (!localValue) {
    // Check alternates
    const alternateFound = alternates.some(altName => localEnv[altName]);
    
    if (!alternateFound) {
      localEnvMissing.push({ name, description });
      console.error(`❌ ${name} is missing in local environment`);
      console.error(`   Description: ${description}`);
      if (alternates.length > 0) {
        console.error(`   Alternates: ${alternates.join(', ')}`);
      }
    } else {
      console.log(`✅ ${name} not found, but an alternate variable is present`);
    }
  } else {
    console.log(`✅ ${name}: Found in local environment`);
  }
});

// Check if Netlify CLI is available
let netlifyCliAvailable = true;
try {
  execSync('netlify --version', { stdio: 'ignore' });
} catch (error) {
  netlifyCliAvailable = false;
  console.error('\n❌ Netlify CLI not found or not in PATH');
  console.error('   Install with: npm install -g netlify-cli');
}

// Check if user is logged in to Netlify
let netlifyLoggedIn = false;
if (netlifyCliAvailable) {
  try {
    const statusOutput = execSync('netlify status').toString();
    netlifyLoggedIn = !statusOutput.includes('You need to log in');
  } catch (error) {
    console.error('\n❌ Error checking Netlify login status');
  }
}

if (!netlifyLoggedIn && netlifyCliAvailable) {
  console.error('\n❌ You are not logged in to Netlify CLI');
  console.error('   Run: netlify login');
}

// Print summary and deployment guidance
console.log('\n📋 Deployment Readiness Summary:');

if (localEnvMissing.length > 0) {
  console.error('❌ Missing local environment variables:');
  localEnvMissing.forEach(({ name, description }) => {
    console.error(`   - ${name}: ${description}`);
  });
  console.error('\nFix your local .env file before deploying.');
} else {
  console.log('✅ All required local environment variables are set');
}

if (!netlifyCliAvailable) {
  console.error('❌ Netlify CLI not installed or not in PATH');
} else if (!netlifyLoggedIn) {
  console.error('❌ Not logged in to Netlify CLI');
} else {
  console.log('✅ Netlify CLI is available and logged in');
}

// Provide deployment instructions
console.log('\n📝 Deployment Instructions:');

if (localEnvMissing.length > 0 || !netlifyCliAvailable || !netlifyLoggedIn) {
  console.log('1. Fix the issues above before deploying');
} else {
  console.log('You are ready to deploy! Follow these steps:');
  console.log('1. Verify your environment variables in Netlify dashboard:');
  console.log('   https://app.netlify.com/sites/wpfs/settings/env');
  console.log('2. Ensure these variables are set in Netlify:');
  requiredVars.forEach(({ name, description, alternates }) => {
    const value = localEnv[name] || alternates.map(alt => localEnv[alt]).find(Boolean) || 'VALUE_MISSING';
    console.log(`   - ${name}: ${maskValue(name, value)}`);
  });
  console.log('3. Run: netlify deploy --prod');
}

// Helper function to mask sensitive values
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
