/**
 * Workspace Commands Module
 *
 * Handles workspace operations:
 * - List workspaces
 * - Get workspace details
 * - Create workspace
 */

const chalk = require('chalk');
const Table = require('cli-table3');

module.exports = {
  /**
   * Handle workspace listing and retrieval
   */
  async handle(options, api, output, config) {
    if (options.list) {
      await this.list(options, api, output, config);
    } else if (options.get) {
      await this.get(options, api, output, config);
    } else {
      // Default to list
      await this.list(options, api, output, config);
    }
  },

  /**
   * List all workspaces
   */
  async list(options, api, output, config) {
    try {
      const params = {};
      if (options.userId) params.user_id = options.userId;

      const response = await api.get('/workspaces', { params });

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          workspaces: response.data.data || response.data.workspaces || []
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Workspaces List'));
        console.log();

        const workspaces = response.data.data || response.data.workspaces || [];

        if (workspaces.length === 0) {
          output.warn('No workspaces found');
          return;
        }

        const table = new Table({
          head: ['ID', 'Name', 'Owner', 'Created'].map(h => chalk.cyan(h)),
          style: { head: [], border: ['grey'] }
        });

        workspaces.forEach(workspace => {
          table.push([
            workspace.id,
            (workspace.name || '-').substring(0, 30),
            workspace.owner_id || '-',
            workspace.created_at || '-'
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
   * Get workspace by ID
   */
  async get(options, api, output, config) {
    try {
      const response = await api.get(`/workspaces/${options.get}`);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          workspace: response.data.data || response.data
        });
      } else {
        const workspace = response.data.data || response.data;
        console.log();
        console.log(chalk.white.bold('Workspace Details'));
        console.log();
        console.log(chalk.cyan('ID:'), workspace.id);
        console.log(chalk.cyan('Name:'), workspace.name);
        console.log(chalk.cyan('Owner ID:'), workspace.owner_id);
        console.log(chalk.cyan('Description:'), workspace.description || '-');
        console.log(chalk.cyan('Created:'), workspace.created_at);
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
   * Create a new workspace
   */
  async create(options, api, output, config) {
    const workspaceData = {
      name: options.name,
      owner_id: options.ownerId ? parseInt(options.ownerId) : undefined,
      description: options.description
    };

    try {
      const response = await api.post('/workspaces', workspaceData);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          workspace: response.data.data || response.data
        });
      } else {
        output.success(`Workspace created: ${workspaceData.name}`);
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
  }
};
