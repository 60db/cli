#!/usr/bin/env node

/**
 * 60db CLI - Agent-native interface for 60db.ai API
 *
 * This CLI provides structured, JSON-friendly commands for:
 * - AI Completions (chat, meeting notes, text completion)
 * - User management
 * - Credit operations
 * - Billing and payments
 * - Workspace management
 *
 * Usage:
 *   60db [command] [options]
 *   60db                    # Enter REPL mode
 *   60db --json [command]    # JSON output for agents
 *
 * Installation:
 *   npm install -g 60db-cli
 *   npm i 60db-cli
 */

// Read version from package.json
const packageJson = require('./package.json');
const CLI_VERSION = packageJson.version;

const { program } = require('commander');
const chalk = require('chalk');
const Table = require('cli-table3');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Simple config manager
const configPath = path.join(os.homedir(), '.60db-cli-config.json');

const configManager = {
  get: (key) => {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config[key];
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8') || '{}');
      config[key] = value;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch {
      const config = {};
      config[key] = value;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
  },
  all: () => {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return {};
    }
  },
  clear: () => {
    try {
      fs.unlinkSync(configPath);
    } catch {}
  }
};

// Import command modules
const userCommands = require('./commands/users');
const creditCommands = require('./commands/credits');
const billingCommands = require('./commands/billing');
const workspaceCommands = require('./commands/workspaces');
const completionCommands = require('./commands/completions');
const authCommands = require('./commands/auth');
const ttsCommands = require('./commands/tts');
const sttCommands = require('./commands/stt');
const categoriesCommands = require('./commands/categories');
const memoryCommands = require('./commands/memory');
const authzCommands = require('./commands/authz');

// Token management
const tokenPath = path.join(os.homedir(), '.60db-cli-token.json');

function loadToken() {
  try {
    if (fs.existsSync(tokenPath)) {
      const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      return tokenData.token;
    }
  } catch {
    return null;
  }
  return null;
}

// Configuration
const CONFIG = {
  apiBaseUrl: process.env.X60DB_API_URL || configManager.get('apiBaseUrl') || 'https://api.60db.ai',
  apiKey: process.env.X60DB_API_KEY || configManager.get('apiKey') || loadToken(),
  outputFormat: 'table', // 'table' or 'json'
};

// Save configuration
function saveConfig(key, value) {
  configManager.set(key, value);
}

// API client with authentication
const api = axios.create({
  baseURL: CONFIG.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token if available
if (CONFIG.apiKey) {
  api.defaults.headers.common['Authorization'] = `Bearer ${CONFIG.apiKey}`;
}

// Output formatters
const output = {
  table: (data, columns) => {
    const table = new Table({
      head: columns.map(c => chalk.cyan(c)),
      style: { head: [], border: ['grey'] }
    });

    if (Array.isArray(data)) {
      data.forEach(row => {
        table.push(columns.map(col => row[col] || ''));
      });
    } else {
      table.push(columns.map(col => data[col] || ''));
    }

    console.log(table.toString());
  },

  json: (data) => {
    console.log(JSON.stringify(data, null, 2));
  },

  success: (message) => {
    console.log(chalk.green('✓'), message);
  },

  error: (message) => {
    console.error(chalk.red('✗'), message);
  },

  info: (message) => {
    console.log(chalk.blue('ℹ'), message);
  },

  warn: (message) => {
    console.log(chalk.yellow('⚠'), message);
  }
};

// Helper function to handle API responses
async function handleRequest(promise) {
  try {
    const response = await promise;
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// Main CLI program
program
  .name('60db')
  .description('60db CLI - Agent-native interface for 60db.ai API with AI completions')
  .version(CLI_VERSION)
  .option('-j, --json', 'Output in JSON format (for agent consumption)')
  .option('-v, --verbose', 'Verbose output')
  .option('--api-url <url>', 'API base URL')
  .option('--api-key <key>', 'API key for authentication');

// Global options handling
program.hook('preAction', (thisCommand, actionCommand) => {
  const options = thisCommand.opts();

  if (options.json) {
    CONFIG.outputFormat = 'json';
  }

  if (options.apiUrl) {
    CONFIG.apiBaseUrl = options.apiUrl;
    saveConfig('apiBaseUrl', options.apiUrl);
    api.defaults.baseURL = options.apiUrl;
  }

  if (options.apiKey) {
    CONFIG.apiKey = options.apiKey;
    saveConfig('apiKey', options.apiKey);
    api.defaults.headers.common['Authorization'] = `Bearer ${options.apiKey}`;
  }
});

// ============================================
// CONFIG COMMANDS
// ============================================

program
  .command('config')
  .description('Manage CLI configuration')
  .option('--set <key=value>', 'Set a configuration value')
  .option('--get <key>', 'Get a configuration value')
  .option('--list', 'List all configuration')
  .option('--clear', 'Clear all configuration')
  .action(async (options) => {
    if (options.set) {
      const [key, value] = options.set.split('=');
      saveConfig(key, value);
      output.success(`Set ${key} = ${value}`);
    } else if (options.get) {
      const value = configManager.get(options.get);
      if (CONFIG.outputFormat === 'json') {
        output.json({ [options.get]: value });
      } else {
        console.log(`${options.get}: ${value || 'not set'}`);
      }
    } else if (options.list) {
      const allConfig = configManager.all;
      if (CONFIG.outputFormat === 'json') {
        output.json(allConfig);
      } else {
        output.table(Object.entries(allConfig).map(([k, v]) => ({ key: k, value: v })), ['key', 'value']);
      }
    } else if (options.clear) {
      configManager.clear();
      output.success('Configuration cleared');
    } else {
      if (CONFIG.outputFormat === 'json') {
        output.json({
          apiBaseUrl: CONFIG.apiBaseUrl,
          hasApiKey: !!CONFIG.apiKey,
          outputFormat: CONFIG.outputFormat
        });
      } else {
        console.log('Current configuration:');
        console.log(`  API URL: ${CONFIG.apiBaseUrl}`);
        console.log(`  API Key: ${CONFIG.apiKey ? '***set***' : 'not set'}`);
        console.log(`  Output Format: ${CONFIG.outputFormat}`);
      }
    }
  });

// ============================================
// USER COMMANDS
// ============================================

program
  .command('users')
  .description('Manage users')
  .option('-l, --list', 'List all users')
  .option('-g, --get <id>', 'Get user by ID')
  .option('-s, --search <query>', 'Search users')
  .option('--page <number>', 'Page number', '1')
  .option('--limit <number>', 'Items per page', '10')
  .action(async (options) => {
    await userCommands.handle(options, api, output, CONFIG);
  });

program
  .command('user:create')
  .description('Create a new user')
  .option('-e, --email <email>', 'User email')
  .option('-n, --name <name>', 'User full name')
  .option('-p, --password <password>', 'User password')
  .option('-r, --role <role>', 'User role (default: user)')
  .action(async (options) => {
    await userCommands.create(options, api, output, CONFIG);
  });

program
  .command('user:update')
  .description('Update user')
  .requiredOption('-i, --id <id>', 'User ID')
  .option('-e, --email <email>', 'User email')
  .option('-n, --name <name>', 'User full name')
  .option('-a, --active <boolean>', 'User active status')
  .action(async (options) => {
    await userCommands.update(options, api, output, CONFIG);
  });

program
  .command('user:delete')
  .description('Delete user')
  .requiredOption('-i, --id <id>', 'User ID')
  .action(async (options) => {
    await userCommands.delete(options, api, output, CONFIG);
  });

// ============================================
// CREDIT COMMANDS
// ============================================

program
  .command('credits:add')
  .description('Add credits to user (superadmin only)')
  .requiredOption('-u, --user-id <id>', 'User ID')
  .option('--tts <number>', 'TTS characters to add')
  .option('--stt <number>', 'STT minutes to add')
  .option('--voice <number>', 'Voice limit to add')
  .option('--amount <number>', 'Wallet amount to add')
  .option('-c, --currency <currency>', 'Currency (default: USD)')
  .option('-d, --description <text>', 'Description')
  .action(async (options) => {
    await creditCommands.add(options, api, output, CONFIG);
  });

program
  .command('credits:balance')
  .description('Get user credit balance')
  .requiredOption('-u, --user-id <id>', 'User ID')
  .action(async (options) => {
    await creditCommands.balance(options, api, output, CONFIG);
  });

program
  .command('credits:history')
  .description('Get credit transaction history')
  .requiredOption('-u, --user-id <id>', 'User ID')
  .option('--limit <number>', 'Limit results', '20')
  .action(async (options) => {
    await creditCommands.history(options, api, output, CONFIG);
  });

// ============================================
// BILLING COMMANDS
// ============================================

program
  .command('billing:invoices')
  .description('List billing invoices')
  .option('-u, --user-id <id>', 'Filter by user ID')
  .option('-w, --workspace-id <id>', 'Filter by workspace ID')
  .option('--status <status>', 'Filter by status')
  .option('--limit <number>', 'Limit results', '20')
  .action(async (options) => {
    await billingCommands.invoices(options, api, output, CONFIG);
  });

program
  .command('billing:transactions')
  .description('List payment transactions')
  .option('-u, --user-id <id>', 'Filter by user ID')
  .option('--type <type>', 'Payment type (one_time, subscription)')
  .option('--status <status>', 'Filter by status')
  .option('--limit <number>', 'Limit results', '20')
  .action(async (options) => {
    await billingCommands.transactions(options, api, output, CONFIG);
  });

// ============================================
// WORKSPACE COMMANDS
// ============================================

program
  .command('workspaces')
  .description('Manage workspaces')
  .option('-l, --list', 'List all workspaces')
  .option('-g, --get <id>', 'Get workspace by ID')
  .option('-u, --user-id <id>', 'Filter by user ID')
  .action(async (options) => {
    await workspaceCommands.handle(options, api, output, CONFIG);
  });

program
  .command('workspace:create')
  .description('Create a new workspace')
  .requiredOption('-n, --name <name>', 'Workspace name')
  .option('-o, --owner-id <id>', 'Owner user ID')
  .option('-d, --description <text>', 'Workspace description')
  .action(async (options) => {
    await workspaceCommands.create(options, api, output, CONFIG);
  });

// ============================================
// AI COMPLETIONS COMMANDS
// ============================================

program
  .command('ai:chat')
  .description('AI chat completions')
  .option('-p, --prompt <text>', 'User prompt/message')
  .option('-m, --model <name>', 'Model name (default: qcall/slm-3b-int4)')
  .option('-s, --system <text>', 'System prompt')
  .option('--messages <json>', 'Messages as JSON array')
  .option('--max-tokens <number>', 'Max tokens (default: 2048)')
  .option('--temperature <number>', 'Temperature (default: 0.1)')
  .option('--top-k <number>', 'Top K (default: 5)')
  .option('--top-p <number>', 'Top P (default: 0.9)')
  .option('--stream <boolean>', 'Enable streaming (default: false)')
  .option('--enable-thinking <boolean>', 'Enable thinking (default: false)')
  .action(async (options) => {
    await completionCommands.chat(options, api, output, CONFIG);
  });

program
  .command('ai:meeting')
  .description('AI meeting notes analysis')
  .option('-p, --prompt <text>', 'Meeting transcript')
  .option('-t, --transcript <text>', 'Meeting transcript (alias)')
  .option('--title <text>', 'Meeting title')
  .option('-m, --model <name>', 'Model name (default: qcall/slm-3b-int4)')
  .option('-s, --system <text>', 'System prompt')
  .option('--max-tokens <number>', 'Max tokens (default: 2048)')
  .option('--temperature <number>', 'Temperature (default: 0.1)')
  .option('--top-k <number>', 'Top K (default: 5)')
  .option('--top-p <number>', 'Top P (default: 0.9)')
  .option('--enable-thinking <boolean>', 'Enable thinking (default: false)')
  .action(async (options) => {
    await completionCommands.meeting(options, api, output, CONFIG);
  });

program
  .command('ai:complete')
  .description('AI text completions')
  .requiredOption('-p, --prompt <text>', 'Text prompt to complete')
  .option('-m, --model <name>', 'Model name (default: qcall/slm-3b-int4)')
  .option('--max-tokens <number>', 'Max tokens (default: 2048)')
  .option('--temperature <number>', 'Temperature (default: 0.1)')
  .option('--stream <boolean>', 'Enable streaming (default: false)')
  .action(async (options) => {
    await completionCommands.text(options, api, output, CONFIG);
  });

// ============================================
// AUTH COMMANDS
// ============================================

program
  .command('auth:login')
  .description('Login to get authentication token')
  .requiredOption('-e, --email <email>', 'User email')
  .requiredOption('-p, --password <password>', 'User password')
  .action(async (options) => {
    await authCommands.login(options, api, output, CONFIG);
  });

program
  .command('auth:logout')
  .description('Logout and clear saved token')
  .action(async (options) => {
    await authCommands.logout(options, api, output, CONFIG);
  });

program
  .command('auth:session')
  .description('Show current session information')
  .action(async (options) => {
    await authCommands.session(options, api, output, CONFIG);
  });

program
  .command('auth:token')
  .description('Get current authentication token')
  .action(async (options) => {
    await authCommands.token(options, api, output, CONFIG);
  });

// ============================================
// TTS COMMANDS
// ============================================

program
  .command('tts:synthesize')
  .description('Synthesize speech from text')
  .requiredOption('-t, --text <text>', 'Text to synthesize')
  .requiredOption('-v, --voice-id <id>', 'Voice ID to use')
  .option('-o, --output <file>', 'Output audio file path (default: tts_<timestamp>.mp3)')
  .option('--speed <number>', 'Speech speed (default: 1)')
  .option('--stability <number>', 'Voice stability 0-100 (default: 50)')
  .option('--similarity <number>', 'Voice similarity 0-100 (default: 75)')
  .action(async (options) => {
    await ttsCommands.synthesize(options, api, output, CONFIG);
  });

program
  .command('tts:voices')
  .description('List available TTS voices')
  .action(async (options) => {
    await ttsCommands.list(options, api, output, CONFIG);
  });

// ============================================
// STT COMMANDS
// ============================================

program
  .command('stt:transcribe')
  .description('Transcribe audio file to text')
  .requiredOption('-f, --file <path>', 'Audio file path')
  .option('-l, --language <code>', 'Language code (e.g. en, hi). Omit or pass "auto" for auto-detect')
  .option('--diarize <boolean>', 'Enable speaker diarization (default: false)')
  .action(async (options) => {
    await sttCommands.transcribe(options, api, output, CONFIG);
  });

program
  .command('stt:languages')
  .description('List available STT languages')
  .action(async (options) => {
    await sttCommands.languages(options, api, output, CONFIG);
  });

// ============================================
// CATEGORIES COMMANDS
// ============================================

program
  .command('categories')
  .description('List available categories')
  .action(async (options) => {
    await categoriesCommands.list(options, api, output, CONFIG);
  });

// ============================================
// MEMORY / RAG COMMANDS
// ============================================

program
  .command('memory:ingest')
  .description('Store a single memory (text) in a collection')
  .requiredOption('-t, --text <text>', 'Memory content (max 100k chars)')
  .option('--title <title>', 'Optional display title')
  .option('-c, --collection <id>', 'Collection ID (defaults to personal)')
  .option('--type <type>', "Memory type: 'user' | 'knowledge' | 'hive'", 'user')
  .option('--no-infer', 'Skip LLM-based fact extraction')
  .action(async (options) => {
    await memoryCommands.ingest(options, api, output, CONFIG);
  });

program
  .command('memory:upload')
  .description('Upload a document (PDF, DOCX, XLSX, PPTX, EML, scanned images, etc.) with OCR')
  .requiredOption('-f, --file <path>', 'Path to the document on local filesystem')
  .option('-c, --collection <id>', 'Collection ID (defaults to personal)')
  .option('--type <type>', "Memory type: 'user' | 'knowledge' | 'hive'", 'knowledge')
  .option('--title <title>', 'Display title (defaults to filename)')
  .option('--chunk-size <n>', 'Max characters per chunk (200-8000)', '1500')
  .option('--chunk-overlap <n>', 'Character overlap between chunks', '200')
  .action(async (options) => {
    await memoryCommands.upload(options, api, output, CONFIG);
  });

program
  .command('memory:search')
  .description('Hybrid semantic + keyword search over memories')
  .requiredOption('-q, --query <text>', 'Search query')
  .option('-c, --collection <id>', 'Collection to search')
  .option('--mode <mode>', "'fast' (default) or 'thinking'", 'fast')
  .option('--limit <n>', 'Max results (1-50)', '10')
  .option('--alpha <n>', 'Semantic weight (0=keyword only, 1=semantic only)', '0.8')
  .option('--recency-bias <n>', 'Weight given to newer memories (0-1)', '0')
  .option('--graph', 'Include knowledge-graph relationships')
  .action(async (options) => {
    await memoryCommands.search(options, api, output, CONFIG);
  });

program
  .command('memory:context')
  .description('Assemble an LLM-ready context string for RAG')
  .requiredOption('-q, --query <text>', 'The user query driving retrieval')
  .option('--session-id <id>', 'Chat session ID for hierarchical context')
  .option('--top-k <n>', 'Max memories to pull', '10')
  .option('--max-context-length <n>', 'Max assembled tokens', '4000')
  .option('--graph', 'Include graph relationships')
  .option('--no-timeline', 'Exclude recent events from context')
  .action(async (options) => {
    await memoryCommands.context(options, api, output, CONFIG);
  });

program
  .command('memory:collections')
  .description('List memory collections visible in this workspace')
  .action(async (options) => {
    await memoryCommands.listCollections(options, api, output, CONFIG);
  });

program
  .command('memory:create-collection')
  .description('Create a new team/knowledge/hive collection (admin/owner only)')
  .requiredOption('-i, --id <id>', 'Collection ID (lowercase, alphanumeric + underscores)')
  .requiredOption('-l, --label <label>', 'Human-readable label')
  .option('-k, --kind <kind>', "'team' | 'knowledge' | 'hive'", 'team')
  .option('--no-shared', 'Do not share with workspace members')
  .action(async (options) => {
    await memoryCommands.createCollection(options, api, output, CONFIG);
  });

program
  .command('memory:usage')
  .description('Monthly memory spend breakdown (unbilled query)')
  .option('--period <period>', "'current_month' (default), 'last_30_days', 'all_time'", 'current_month')
  .action(async (options) => {
    await memoryCommands.usage(options, api, output, CONFIG);
  });

program
  .command('memory:status')
  .description("Poll a memory's ingestion status")
  .requiredOption('-i, --id <id>', 'Memory ID')
  .option('-c, --collection <id>', 'Collection the memory belongs to')
  .action(async (options) => {
    await memoryCommands.status(options, api, output, CONFIG);
  });

program
  .command('memory:delete')
  .description('Soft-delete a memory (24h undo grace period)')
  .requiredOption('-i, --id <id>', 'Memory ID to delete')
  .option('-c, --collection <id>', 'Collection context')
  .option('--type <type>', 'Memory type', 'user')
  .action(async (options) => {
    await memoryCommands.delete(options, api, output, CONFIG);
  });

// ============================================
// AUTHZ (Cerbos) COMMANDS
// ============================================

program
  .command('authz:permissions')
  .description('Show effective permissions for the current user in the active workspace')
  .action(async (options) => {
    await authzCommands.permissions(options, api, output, CONFIG);
  });

program
  .command('authz:check')
  .description('Probe whether a (resource, action) is allowed by policy')
  .requiredOption('-r, --resource <resource>', 'Resource kind (memory, tts, workspace, billing, etc.)')
  .requiredOption('-a, --action <action>', "Action name (e.g. 'create', 'search', 'billing:manage')")
  .action(async (options) => {
    await authzCommands.check(options, api, output, CONFIG);
  });

// ============================================
// REPL MODE
// ============================================

// REPL functionality
function startRepl() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('60db> ')
  });

  console.log();
  console.log(chalk.cyan('╔══════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + '       ' + chalk.white.bold('60db CLI v1.0.0') + '       ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '   ' + chalk.gray('Agent-native interface') + '      ' + chalk.cyan('║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════╝'));
  console.log();
  console.log(chalk.gray('Type') + ' ' + chalk.white('help') + ' ' + chalk.gray('for available commands'));
  console.log(chalk.gray('Type') + ' ' + chalk.white('exit') + ' ' + chalk.gray('to quit'));
  console.log();

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    if (input === 'exit' || input === 'quit') {
      console.log(chalk.gray('Goodbye! 👋'));
      rl.close();
      return;
    }

    if (input === 'help') {
      console.log();
      console.log(chalk.white.bold('Available Commands:'));
      console.log();
      console.log(chalk.cyan('  Authentication:'));
      console.log('    auth:login               Login with email/password');
      console.log('    auth:logout              Logout and clear token');
      console.log('    auth:session             Show current session info');
      console.log('    auth:token               Get current token');
      console.log();
      console.log(chalk.cyan('  Users:'));
      console.log('    users                    List all users');
      console.log('    user:get <id>            Get user details');
      console.log('    user:create              Create new user');
      console.log('    user:update              Update user');
      console.log('    user:delete              Delete user');
      console.log();
      console.log(chalk.cyan('  Credits:'));
      console.log('    credits:add              Add credits to user');
      console.log('    credits:balance          Get user balance');
      console.log('    credits:history          Get transaction history');
      console.log();
      console.log(chalk.cyan('  Billing:'));
      console.log('    billing:invoices         List invoices');
      console.log('    billing:transactions     List transactions');
      console.log();
      console.log(chalk.cyan('  Workspaces:'));
      console.log('    workspaces               List workspaces');
      console.log('    workspace:create         Create workspace');
      console.log();
      console.log(chalk.cyan('  AI Completions:'));
      console.log('    ai:chat                  AI chat completions');
      console.log('    ai:meeting               AI meeting notes analysis');
      console.log('    ai:complete              AI text completions');
      console.log();
      console.log(chalk.cyan('  TTS (Text-to-Speech):'));
      console.log('    tts:synthesize           Generate speech from text');
      console.log('    tts:voices               List available voices');
      console.log();
      console.log(chalk.cyan('  STT (Speech-to-Text):'));
      console.log('    stt:transcribe           Transcribe audio to text');
      console.log('    stt:languages            List available languages');
      console.log();
      console.log(chalk.cyan('  Categories:'));
      console.log('    categories              List available categories');
      console.log();
      console.log(chalk.cyan('  Config:'));
      console.log('    config                   Show configuration');
      console.log('    config --set key=value   Set config value');
      console.log('    config --json            Enable JSON output');
      console.log();
      console.log(chalk.gray('  Other:'));
      console.log('    help                     Show this help');
      console.log('    exit                     Exit REPL');
      console.log();
      rl.prompt();
      return;
    }

    // Parse and execute command
    try {
      const args = input.split(/\s+/);
      const cmd = args[0];

      // Execute command
      await program.parseAsync(['node', 'index.js', ...args], { from: 'user' });
    } catch (error) {
      output.error(error.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

// Check if we're in REPL mode (no arguments)
const args = process.argv.slice(2);
if (args.length === 0) {
  startRepl();
} else {
  // Parse commands normally
  program.parse(process.argv);
}

module.exports = { program, api, output, CONFIG };
