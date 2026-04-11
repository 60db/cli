/**
 * Auth Commands Module
 *
 * Handles authentication operations:
 * - User login
 * - Token management
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tokenPath = path.join(os.homedir(), '.60db-cli-token.json');

const tokenManager = {
  save: (token, email, userId, inviteeId, workspaceId) => {
    try {
      const tokenData = {
        token,
        email,
        userId,
        inviteeId,
        workspaceId,
        savedAt: new Date().toISOString()
      };
      fs.writeFileSync(tokenPath, JSON.stringify(tokenData, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save token:', error.message);
      return false;
    }
  },
  load: () => {
    try {
      if (fs.existsSync(tokenPath)) {
        return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      }
      return null;
    } catch {
      return null;
    }
  },
  clear: () => {
    try {
      if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath);
      }
      return true;
    } catch {
      return false;
    }
  }
};

module.exports = {
  /**
   * User login
   */
  async login(options, api, output, config) {
    const loginData = {
      email: options.email,
      password: options.password
    };

    try {
      const response = await api.post('/auth/login', loginData);

      if (response.data && response.data.token) {
        const { token } = response.data;

        // Extract user info from JWT if available
        const userId = response.data.user?.id || response.data.userId || response.data.user_id;
        const email = response.data.user?.email || options.email;
        const inviteeId = response.data.inviteeId || response.data.invitee_id;
        const workspaceId = response.data.workspaceId || response.data.workspace_id;

        if (tokenManager.save(token, email, userId, inviteeId, workspaceId)) {
          if (config.outputFormat === 'json') {
            output.json({
              success: true,
              message: 'Login successful',
              user: {
                email,
                userId,
                inviteeId,
                workspaceId
              }
            });
          } else {
            console.log();
            output.success('Login successful!');
            console.log(chalk.gray('Email:'), email);
            console.log(chalk.gray('User ID:'), userId || 'N/A');
            if (workspaceId) console.log(chalk.gray('Workspace ID:'), workspaceId);
            console.log();
            console.log(chalk.gray('Token saved to:'), tokenPath);
            console.log();
          }
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      if (config.outputFormat === 'json') {
        output.json({
          success: false,
          error: error.response?.data?.message || error.message
        });
      } else {
        output.error(error.response?.data?.message || error.message);
      }
    }
  },

  /**
   * User logout
   */
  async logout(options, api, output, config) {
    if (tokenManager.clear()) {
      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          message: 'Logged out successfully'
        });
      } else {
        output.success('Logged out successfully');
      }
    } else {
      if (config.outputFormat === 'json') {
        output.json({
          success: false,
          error: 'No active session found'
        });
      } else {
        output.warn('No active session found');
      }
    }
  },

  /**
   * Get current session info
   */
  async session(options, api, output, config) {
    const tokenData = tokenManager.load();

    if (!tokenData) {
      if (config.outputFormat === 'json') {
        output.json({
          success: false,
          error: 'No active session'
        });
      } else {
        output.warn('No active session found');
        console.log();
        console.log(chalk.gray('Please login first:'));
        console.log(chalk.gray('  60db auth:login --email your@email.com --password yourpassword'));
        console.log();
      }
      return;
    }

    if (config.outputFormat === 'json') {
      output.json({
        success: true,
        session: {
          email: tokenData.email,
          userId: tokenData.userId,
          inviteeId: tokenData.inviteeId,
          workspaceId: tokenData.workspaceId,
          savedAt: tokenData.savedAt
        }
      });
    } else {
      console.log();
      console.log(chalk.white.bold('Current Session:'));
      console.log();
      console.log(chalk.cyan('Email:'), tokenData.email);
      console.log(chalk.cyan('User ID:'), tokenData.userId || 'N/A');
      if (tokenData.inviteeId) console.log(chalk.cyan('Invitee ID:'), tokenData.inviteeId);
      if (tokenData.workspaceId) console.log(chalk.cyan('Workspace ID:'), tokenData.workspaceId);
      console.log(chalk.cyan('Token saved at:'), tokenData.savedAt);
      console.log(chalk.cyan('Token file:'), tokenPath);
      console.log();
    }
  },

  /**
   * Export token for use
   */
  async token(options, api, output, config) {
    const tokenData = tokenManager.load();

    if (!tokenData) {
      if (config.outputFormat === 'json') {
        output.json({
          success: false,
          error: 'No active session'
        });
      } else {
        output.error('No active session. Please login first.');
      }
      return;
    }

    if (config.outputFormat === 'json') {
      output.json({
        success: true,
        token: tokenData.token
      });
    } else {
      console.log(tokenData.token);
    }
  }
};
