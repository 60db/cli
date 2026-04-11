# 60db CLI

Agent-native command-line interface for 60db.ai API - AI completions, TTS, STT, user management, credits, billing, and workspaces with structured JSON output.

## Features

- **Dual Mode**: Interactive REPL + subcommand interface
- **Agent-Native**: Structured JSON output with `--json` flag
- **AI Completions**: Chat, meeting notes analysis, and text completion
- **TTS (Text-to-Speech)**: Generate speech from text with multiple voices
- **STT (Speech-to-Text)**: Transcribe audio files with multiple languages
- **Authentication**: Secure login and token management
- **Complete Coverage**: Users, Credits, Billing, Workspaces, Categories
- **Configuration**: Persistent config with `60db config`

## Installation

### Global Installation

```bash
npm install -g 60db-cli
```

### Local Installation

```bash
npm install 60db-cli
```

## Quick Start

### Interactive Mode (REPL)

```bash
60db
60db --version
```

Enter the interactive shell with tab completion and persistent session:

```
60db> users
60db> credits:add --user-id 123 --amount 50
60db> config --list
60db> exit
```

### Command Mode

```bash
# List all users
60db users --list

# Add credits to user
60db credits:add --user-id 123 --amount 50 --currency USD

# Get JSON output for agent consumption
60db --json users --list
```

## Commands

### Authentication

```bash
# Login with email and password (recommended)
60db auth:login --email your@email.com --password yourpassword

# Show current session info
60db auth:session

# Get current authentication token
60db auth:token

# Logout and clear token
60db auth:logout
```

### Configuration

```bash
# Show current configuration
60db config

# Set API URL
60db config --set apiBaseUrl=https://api.60db.ai

# Set API key
60db config --set apiKey=your_api_key_here

# List all config
60db config --list

# Clear config
60db config --clear
```

### Users

```bash
# List all users
60db users --list --page 1 --limit 10

# Get user details
60db users --get 123

# Search users
60db users --search "john@example.com"

# Create new user
60db user:create --email user@example.com --name "John Doe" --password secret123

# Update user
60db user:update --id 123 --name "Jane Doe" --active true

# Delete user
60db user:delete --id 123
```

### Credits

```bash
# Add bonus credits
60db credits:add --user-id 123 --tts 1000 --stt 60 --voice 10

# Add wallet amount
60db credits:add --user-id 123 --amount 50.00 --currency USD --description "Refund"

# Add both bonus credits and amount
60db credits:add --user-id 123 --tts 1000 --amount 25.00

# Get user balance
60db credits:balance --user-id 123

# Get transaction history
60db credits:history --user-id 123 --limit 20
```

### Billing

```bash
# List invoices
60db billing:invoices --limit 20

# Filter by user
60db billing:invoices --user-id 123

# Filter by status
60db billing:invoices --status paid

# List payment transactions
60db billing:transactions --limit 20

# Filter by type
60db billing:transactions --type one_time
```

### Workspaces

```bash
# List all workspaces
60db workspaces --list

# Get workspace details
60db workspaces --get 456

# Filter by user
60db workspaces --list --user-id 123

# Create workspace
60db workspace:create --name "My Workspace" --owner-id 123 --description "Project workspace"
```

### AI Completions

```bash
# AI Chat Completions
60db ai:chat --prompt "Hello, how are you?"

# With custom system prompt
60db ai:chat --prompt "Summarize this text" --system "You are a helpful assistant."

# With specific model
60db ai:chat --prompt "Generate code" --model "qcall/slm-3b-int4" --temperature 0.7

# AI Meeting Notes Analysis
60db ai:meeting --transcript "Meeting transcript here..." --title "Weekly Standup"

# AI Text Completion
60db ai:complete --prompt "Once upon a time" --max-tokens 100

# With JSON output for agents
60db --json ai:chat --prompt "Analyze this data"
```

**AI Chat Options:**
- `-p, --prompt <text>` - User prompt/message
- `-m, --model <name>` - Model name (default: qcall/slm-3b-int4)
- `-s, --system <text>` - System prompt
- `--messages <json>` - Messages as JSON array
- `--max-tokens <number>` - Max tokens (default: 2048)
- `--temperature <number>` - Temperature (default: 0.1)
- `--top-k <number>` - Top K (default: 5)
- `--top-p <number>` - Top P (default: 0.9)
- `--stream <boolean>` - Enable streaming (default: false)
- `--enable-thinking <boolean>` - Enable thinking (default: false)

**AI Meeting Notes Options:**
- `-p, --prompt <text>` or `-t, --transcript <text>` - Meeting transcript
- `--title <text>` - Meeting title
- `-m, --model <name>` - Model name
- `-s, --system <text>` - Custom system prompt
- All other AI options supported

### TTS (Text-to-Speech)

```bash
# Synthesize speech from text
60db tts:synthesize --text "Hello this is devendra" --voice-id "voice_id_here"

# Specify output file
60db tts:synthesize --text "Hello world" --voice-id "abc123" --output speech.mp3

# Adjust speech parameters
60db tts:synthesize --text "Hello" --voice-id "abc123" --speed 1.2 --stability 50 --similarity 75

# List available voices
60db tts:voices
```

**TTS Options:**
- `-t, --text <text>` - Text to synthesize (required)
- `-v, --voice-id <id>` - Voice ID to use (required)
- `-o, --output <file>` - Output audio file path (default: tts_<timestamp>.mp3)
- `--speed <number>` - Speech speed (default: 1)
- `--stability <number>` - Voice stability 0-100 (default: 50)
- `--similarity <number>` - Voice similarity 0-100 (default: 75)

### STT (Speech-to-Text)

```bash
# Transcribe audio file
60db stt:transcribe --file audio.wav

# Specify language
60db stt:transcribe --file audio.wav --language hi

# Include segments in output
60db stt:transcribe --file recording.wav --language auto --diarize true

# List available languages
60db stt:languages
```

**STT Options:**
- `-f, --file <path>` - Audio file path (required)
- `-l, --language <code>` - Language code (default: en)
- `--diarize <boolean>` - Enable speaker diarization (default: false)

### Categories

```bash
# List available categories
60db categories
```

## JSON Output (for AI Agents)

All commands support `--json` flag for structured output:

```bash
60db --json users --list
```

Response:
```json
{
  "success": true,
  "users": [
    {
      "id": 123,
      "email": "user@example.com",
      "full_name": "John Doe",
      "system_role": "user",
      "is_active": true,
      "is_verify_email": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total_users": 1,
    "total_pages": 1,
    "current_page": 1,
    "limit": 10
  }
}
```

## Environment Variables

```bash
# Set API URL
export X60DB_API_URL=https://api.60db.ai

# Set API Key
export X60DB_API_KEY=your_api_key_here
```

## Examples

### Authentication & Setup

```bash
# Login to get token
60db auth:login --email your@email.com --password yourpassword

# Check session
60db auth:session

# Or manually set API key
60db config --set apiKey=your_token_here
```

### AI Chat Completion

```bash
# Simple chat
60db ai:chat --prompt "Explain quantum computing"

# With system prompt for specific behavior
60db ai:chat --prompt "Review this code" --system "You are an expert code reviewer. Be concise and actionable."

# Higher temperature for creative responses
60db ai:chat --prompt "Write a poem about AI" --temperature 0.9
```

### TTS - Generate Speech

```bash
# Generate speech from text
60db tts:synthesize --text "Hello, this is devendra" --voice-id "1a8c6331-c79b-47d3-9893-09160a245a3e"

# List available voices first
60db tts:voices

# Save to specific file
60db tts:synthesize --text "Welcome to our service" --voice-id "abc123" --output welcome.mp3
```

### STT - Transcribe Audio

```bash
# Transcribe audio file
60db stt:transcribe --file meeting.wav

# Transcribe Hindi audio
60db stt:transcribe --file recording.wav --language hi

# List available languages
60db stt:languages
```

### AI Meeting Notes Analysis

```bash
# Analyze meeting transcript
60db ai:meeting --transcript "John: We need to finish by Friday. Jane: I'll handle frontend." --title "Sprint Planning"

# Get structured JSON output
60db --json ai:meeting --transcript "$TRANSCRIPT" > meeting-notes.json
```

### Add credits to multiple users

```bash
for user_id in 123 456 789; do
  60db credits:add --user-id $user_id --amount 10 --description "Monthly bonus"
done
```

### Export user data to JSON

```bash
60db --json users --list > users.json
```

### Monitor transactions in real-time

```bash
watch -n 5 '60db --json billing:transactions --limit 5'
```

## Error Handling

All commands return structured error responses:

```json
{
  "success": false,
  "error": "User not found"
}
```

## Requirements

- Node.js >= 16.0.0
- npm or yarn

## Support

For issues or questions, please visit:
- GitHub: https://github.com/60db-ai/60db-cli
- Issues: https://github.com/60db-ai/60db-cli/issues

## License

MIT
