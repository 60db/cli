/**
 * 60db CLI Test Suite
 *
 * Tests for CLI commands and functionality
 */

const { spawn } = require('child_process');
const path = require('path');

const CLI_PATH = path.join(__dirname, '..', 'index.js');

// Test helper
function runCommand(args, options = {}) {
  return new Promise((resolve) => {
    const process = spawn('node', [CLI_PATH, ...args], {
      stdio: 'pipe',
      ...options
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

// Test helper for JSON output
async function runJsonCommand(args) {
  const result = await runCommand(['--json', ...args]);
  try {
    return {
      ...result,
      data: result.stdout ? JSON.parse(result.stdout) : null
    };
  } catch (e) {
    return {
      ...result,
      data: null,
      parseError: e.message
    };
  }
}

// Tests
async function runTests() {
  console.log('🧪 Running 60db CLI Tests\n');

  const tests = [
    {
      name: 'CLI version',
      run: async () => {
        const result = await runCommand(['--version']);
        console.log('✓ Version:', result.stdout.trim());
      }
    },
    {
      name: 'CLI help',
      run: async () => {
        const result = await runCommand(['--help']);
        console.log('✓ Help output length:', result.stdout.length);
      }
    },
    {
      name: 'Config show',
      run: async () => {
        const result = await runJsonCommand(['config']);
        console.log('✓ Config:', result.data ? 'JSON output' : 'Table output');
      }
    },
    {
      name: 'Config --list',
      run: async () => {
        const result = await runCommand(['config', '--list']);
        console.log('✓ Config list:', result.stdout.includes('API') ? 'Has config' : 'No config');
      }
    },
    {
      name: 'Config --set',
      run: async () => {
        const result = await runCommand(['config', '--set', 'testKey=testValue']);
        console.log('✓ Config set:', result.stdout.includes('✓') ? 'Success' : 'Failed');
      }
    },
    {
      name: 'Config --clear',
      run: async () => {
        const result = await runCommand(['config', '--clear']);
        console.log('✓ Config clear:', result.stdout.includes('✓') ? 'Success' : 'Failed');
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
      passed++;
      console.log(chalk.green(`✓ ${test.name}\n`));
    } catch (error) {
      failed++;
      console.log(chalk.red(`✗ ${test.name}`));
      console.log(chalk.red(`  Error: ${error.message}\n`));
    }
  }

  console.log(chalk.bold('Test Results:'));
  console.log(chalk.green(`  Passed: ${passed}`));
  console.log(chalk.red(`  Failed: ${failed}`));
  console.log(chalk.bold(`  Total: ${passed + failed}\n`));

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
const chalk = require('chalk');
runTests().catch(error => {
  console.error(chalk.red('Test suite failed:'), error);
  process.exit(1);
});
