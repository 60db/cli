/**
 * User Commands Module
 *
 * Handles user operations:
 * - List users
 * - Get user details
 * - Create user
 * - Update user
 * - Delete user
 */

const chalk = require('chalk');
const Table = require('cli-table3');

module.exports = {
  /**
   * Handle user listing and retrieval
   */
  async handle(options, api, output, config) {
    if (options.list) {
      await this.list(options, api, output, config);
    } else if (options.get) {
      await this.get(options, api, output, config);
    } else if (options.search) {
      await this.search(options, api, output, config);
    } else {
      // Default to list
      await this.list(options, api, output, config);
    }
  },

  /**
   * List all users
   */
  async list(options, api, output, config) {
    try {
      const params = {
        page: parseInt(options.page) || 1,
        limit: parseInt(options.limit) || 10
      };

      const response = await api.get('/super-admin/users', { params });

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          users: response.data.data || response.data.users || [],
          pagination: response.data.pagination || {
            total_users: response.data.total_users || 0,
            total_pages: response.data.total_pages || 0,
            current_page: params.page,
            limit: params.limit
          }
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Users List'));
        console.log();

        const users = response.data.data || response.data.users || [];

        if (users.length === 0) {
          output.warn('No users found');
          return;
        }

        const table = new Table({
          head: ['ID', 'Email', 'Name', 'Role', 'Active', 'Verified', 'Created'].map(h => chalk.cyan(h)),
          style: { head: [], border: ['grey'] }
        });

        users.forEach(user => {
          table.push([
            user.id,
            user.email?.substring(0, 30) || '-',
            user.full_name?.substring(0, 15) || '-',
            user.system_role || user.role || '-',
            user.is_active ? '✓' : '✗',
            user.is_verify_email ? '✓' : '✗',
            user.created_at || '-'
          ]);
        });

        console.log(table.toString());
        console.log();

        const pagination = response.data.pagination || {};
        if (pagination.total_pages > 1) {
          console.log(chalk.gray(`Page ${pagination.current_page || params.page} of ${pagination.total_pages}`));
          console.log(chalk.gray(`Total: ${pagination.total_users || users.length} users`));
          console.log();
        }
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
   * Get user by ID
   */
  async get(options, api, output, config) {
    try {
      const response = await api.get(`/super-admin/users/${options.get}`);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          user: response.data.data || response.data
        });
      } else {
        const user = response.data.data || response.data;
        console.log();
        console.log(chalk.white.bold('User Details'));
        console.log();
        console.log(chalk.cyan('ID:'), user.id);
        console.log(chalk.cyan('Hash ID:'), user.hash_id || '-');
        console.log(chalk.cyan('Email:'), user.email);
        console.log(chalk.cyan('Name:'), user.full_name);
        console.log(chalk.cyan('Role:'), user.system_role || user.role);
        console.log(chalk.cyan('Active:'), user.is_active ? 'Yes' : 'No');
        console.log(chalk.cyan('Email Verified:'), user.is_verify_email ? 'Yes' : 'No');
        console.log(chalk.cyan('Created:'), user.created_at);
        console.log();
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
   * Search users
   */
  async search(options, api, output, config) {
    try {
      const params = {
        search: options.search,
        page: 1,
        limit: 10
      };

      const response = await api.get('/super-admin/users', { params });

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          users: response.data.data || response.data.users || [],
          pagination: response.data.pagination || {}
        });
      } else {
        console.log();
        console.log(chalk.white.bold(`Search Results for "${options.search}"`));
        console.log();

        const users = response.data.data || response.data.users || [];

        if (users.length === 0) {
          output.warn('No users found');
          return;
        }

        const table = new Table({
          head: ['ID', 'Email', 'Name', 'Role', 'Active', 'Verified', 'Created'].map(h => chalk.cyan(h)),
          style: { head: [], border: ['grey'] }
        });

        users.forEach(user => {
          table.push([
            user.id,
            user.email?.substring(0, 30) || '-',
            user.full_name?.substring(0, 15) || '-',
            user.system_role || user.role || '-',
            user.is_active ? '✓' : '✗',
            user.is_verify_email ? '✓' : '✗',
            user.created_at || '-'
          ]);
        });

        console.log(table.toString());
        console.log();
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
   * Create a new user
   */
  async create(options, api, output, config) {
    const userData = {
      email: options.email,
      full_name: options.name,
      password: options.password,
      system_role: options.role || 'user'
    };

    try {
      const response = await api.post('/super-admin/users', userData);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          user: response.data.data || response.data
        });
      } else {
        output.success(`User created: ${userData.email}`);
        console.log(chalk.gray('ID:'), response.data.data?.id || response.data.id);
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
   * Update user
   */
  async update(options, api, output, config) {
    const userData = {};
    if (options.email) userData.email = options.email;
    if (options.name) userData.full_name = options.name;
    if (options.active !== undefined) userData.is_active = options.active === 'true';

    try {
      const response = await api.put(`/super-admin/users/${options.id}`, userData);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          user: response.data.data || response.data
        });
      } else {
        output.success(`User ${options.id} updated`);
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
   * Delete user
   */
  async delete(options, api, output, config) {
    try {
      await api.delete(`/super-admin/users/${options.id}`);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          message: `User ${options.id} deleted`
        });
      } else {
        output.success(`User ${options.id} deleted`);
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
  }
};
