#!/usr/bin/env node

/**
 * Test script to verify stdin input works after raw mode
 * This simulates the exact flow that happens in the app
 */

const readline = require('readline');

async function testFlow() {
  console.log('\n=== Testing stdin input after raw mode ===\n');
  
  // Step 1: Simulate selectMenu behavior
  console.log('Step 1: Enabling raw mode (simulating menu navigation)...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  
  // Simulate some raw mode activity
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Step 2: Simulate cleanup
  console.log('Step 2: Cleaning up and disabling raw mode...');
  process.stdin.removeAllListeners('data');
  process.stdin.setRawMode(false);
  
  // Step 3: Wait for terminal to stabilize (the critical fix)
  console.log('Step 3: Waiting 50ms for terminal to stabilize...');
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Step 4: Try to use readline
  console.log('Step 4: Creating readline interface...\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('Type something and press Enter: ', (answer) => {
      console.log(`\n✅ SUCCESS! You typed: "${answer}"`);
      rl.close();
      resolve();
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('\n❌ TIMEOUT: No input received in 10 seconds');
      console.log('This means the stdin issue is NOT fixed');
      rl.close();
      process.exit(1);
    }, 10000);
  });
}

testFlow()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    console.log('The stdin fix is working correctly.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
