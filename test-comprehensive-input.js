#!/usr/bin/env node

/**
 * Comprehensive test for the input issue fix
 * Simulates the exact flow: selectMenu (raw mode) -> large output -> readline input
 */

const readline = require('readline');

// Helper functions matching the actual implementation
function drainStdout() {
  return new Promise((resolve) => {
    if (process.stdout.write('\n')) {
      setImmediate(() => resolve());
    } else {
      process.stdout.once('drain', () => setImmediate(resolve));
    }
  });
}

async function ensureStdinReady() {
  await drainStdout();
  
  process.stdin.pause();
  process.stdin.removeAllListeners('data');
  process.stdin.removeAllListeners('keypress');
  
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
  
  process.stdin.resume();
  
  return new Promise((resolve) => setTimeout(resolve, 200));
}

function ask(rl, question) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    const sigintHandler = () => {
      if (resolved) return;
      resolved = true;
      
      process.removeListener('SIGINT', sigintHandler);
      rl.close();
      console.log('\n👋 Goodbye!\n');
      process.exit(0);
    };
    
    process.on('SIGINT', sigintHandler);
    
    rl.question(question, (answer) => {
      if (resolved) return;
      resolved = true;
      
      process.removeListener('SIGINT', sigintHandler);
      resolve(answer.trim());
    });
    
    rl.resume();
  });
}

async function simulateSelectMenu() {
  console.log('Step 1: Simulating selectMenu (entering raw mode)...');
  
  // Enter raw mode like selectMenu does
  const isRaw = process.stdin.isRaw;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  
  // Simulate menu selection
  await new Promise((resolve) => {
    let selected = false;
    const handler = (key) => {
      if (key[0] === 13) { // Enter
        selected = true;
        process.stdin.removeAllListeners('data');
        process.stdin.setRawMode(isRaw);
        resolve();
      }
    };
    
    process.stdin.on('data', handler);
    console.log('  Press Enter to simulate menu selection...');
    
    // Auto-select after 2 seconds
    setTimeout(() => {
      if (!selected) {
        process.stdin.removeAllListeners('data');
        process.stdin.setRawMode(isRaw);
        console.log('  (Auto-selected)');
        resolve();
      }
    }, 2000);
  });
  
  console.log('  ✓ Menu selection complete\n');
}

async function test() {
  console.log('\n=== Comprehensive Input Test ===\n');
  
  // Step 1: Simulate menu selection
  await simulateSelectMenu();
  
  // Step 2: Generate large output (like analysis report)
  console.log('Step 2: Generating large output (simulating analysis results)...');
  const largeOutput = Array(100).fill('Line of text in the analysis report').join('\n');
  
  // Step 3: Use the new async write approach
  console.log('Step 3: Writing output with async handling...');
  await new Promise((resolve) => {
    if (process.stdout.write(largeOutput + '\n')) {
      setImmediate(resolve);
    } else {
      process.stdout.once('drain', () => setImmediate(resolve));
    }
  });
  
  console.log('\nAnalysis complete!\n');
  
  // Step 4: Ensure stdin is ready
  console.log('Step 4: Preparing stdin for input...');
  await ensureStdinReady();
  
  // Step 5: Try to get input
  console.log('Step 5: Waiting for user input...\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await ask(rl, 'Press Enter to test (or Ctrl+C to test exit): ');
  
  console.log(`\n✅ SUCCESS! Input received: "${answer}"`);
  console.log('✓ Enter key is working correctly');
  console.log('✓ Terminal input is responsive\n');
  
  rl.close();
  process.exit(0);
}

test().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
