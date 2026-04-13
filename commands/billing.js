/**
 * Billing Commands Module
 *
 * Handles billing operations:
 * - List invoices
 * - List payment transactions
 *
 * All billing is workspace-level, USD-only.
 */

const chalk = require('chalk');
const Table = require('cli-table3');

module.exports = {
  /**
   * List billing invoices
   */
  async invoices(options, api, output, config) {
    try {
      const params = { limit: parseInt(options.limit) || 20 };
      if (options.workspaceId) params.workspace_id = options.workspaceId;
      if (options.status) params.status = options.status;

      const response = await api.get('/billing/invoices', { params });

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          invoices: response.data.data,
          pagination: response.data.pagination
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Billing Invoices'));
        console.log();

        if (response.data.data.length === 0) {
          output.warn('No invoices found');
          return;
        }

        const table = new Table({
          head: ['ID', 'Workspace', 'Plan', 'Amount', 'Status', 'Date'].map(h => chalk.cyan(h)),
          style: { head: [], border: ['grey'] }
        });

        response.data.data.forEach(invoice => {
          const statusColor = invoice.status === 'paid' ? chalk.green :
                            invoice.status === 'pending' ? chalk.yellow : chalk.red;
          table.push([
            invoice.id,
            invoice.workspace_id || '-',
            invoice.plan_id || '-',
            `$${invoice.amount || 0}`,
            statusColor(invoice.status || '-'),
            invoice.created_at || '-'
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
   * List payment transactions
   */
  async transactions(options, api, output, config) {
    try {
      const params = { limit: parseInt(options.limit) || 20 };
      if (options.type) params.payment_type = options.type;
      if (options.status) params.status = options.status;

      const response = await api.get('/billing/transactions', { params });

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          transactions: response.data.data,
          pagination: response.data.pagination
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Payment Transactions'));
        console.log();

        if (response.data.data.transactions?.length === 0) {
          output.warn('No transactions found');
          return;
        }

        const txns = response.data.data.transactions || response.data.data || [];
        const table = new Table({
          head: ['ID', 'Workspace', 'Type', 'Amount', 'Status', 'Date'].map(h => chalk.cyan(h)),
          style: { head: [], border: ['grey'] }
        });

        txns.forEach(tx => {
          const statusColor = tx.status === 'succeeded' ? chalk.green :
                            tx.status === 'pending' ? chalk.yellow : chalk.red;
          table.push([
            tx.id,
            tx.workspace_name || tx.workspace_id || '-',
            tx.payment_type || '-',
            `$${tx.amount || 0}`,
            statusColor(tx.status || '-'),
            tx.transaction_date || tx.created_at || '-'
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
  }
};
