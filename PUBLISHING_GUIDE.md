# Publishing Guide for 60db-cli

This guide will help you publish the 60db-cli package to npm.

## Prerequisites

1. **npm account**: Create an account at https://www.npmjs.com/signup if you don't have one.
2. **Login**: Run `npm login` to authenticate.

## Step-by-Step Publishing

### 1. Navigate to the Package Directory

```bash
cd 60db-cli-sdk
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Tests

```bash
npm test
```

### 4. Check Package Content

```bash
npm pack --dry-run
```

This will show you what files will be included in the package without actually creating it.

### 5. Build the Package (Optional)

```bash
npm pack
```

This creates a `.tgz` file that you can test locally.

### 6. Test Locally (Optional)

```bash
# Install from the tarball
npm install -g ./60db-cli-1.0.0.tgz

# Test the CLI
60db --version
60db --help
```

### 7. Publish to npm

```bash
npm publish
```

For the first time, you may need to use:
```bash
npm publish --access public
```

## Post-Publishing

### Verify the Package

1. Visit https://www.npmjs.com/package/60db-cli
2. Install it globally:
   ```bash
   npm install -g 60db-cli
   ```
3. Test it:
   ```bash
   60db --version
   60db --help
   60db config
   ```

### Update Version

When making changes, update the version in `package.json`:

```bash
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0
```

Then publish again:
```bash
npm publish
```

## Environment Variables

Users can set these environment variables:

```bash
export X60DB_API_URL=https://api.60db.ai
export X60DB_API_KEY=your_api_key_here
```

## Usage Examples

After installation, users can run:

```bash
# Interactive mode
60db

# List users
60db users --list

# Add credits
60db credits:add --user-id 123 --tts 1000 --stt 60

# JSON output
60db --json users --list
```

## Troubleshooting

### Package Name Already Taken

If the package name is already taken, you'll need to choose a different name. Update `package.json`:

```json
{
  "name": "@your-scope/60db-cli"
}
```

### Permission Denied

Make sure you're logged in to npm:
```bash
npm whoami
npm login
```

### Files Not Included

Check your `.npmignore` file to ensure you're not excluding necessary files.

## Maintenance

### Unpublish (Emergency Only)

```bash
npm unpublish 60db-cli --force
```

**Warning**: This should only be done in emergencies, as it breaks existing installations.

### Deprecate

```bash
npm deprecate 60db-cli "This package is deprecated. Use new-package instead."
```
