/**
 * Billing Commands Module
 *
 * Handles billing operations:
 * - List invoices
 * - List payment transactions
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
      if (options.userId) params.user_id = options.userId;
      if (options.workspaceId) params.workspace_id = options.workspaceId;
      if (options.status) params.status = options.status;

      const response = await api.get('/billing/invoices', { params });

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          invoices: response.data.data || response.data.invoices || [],
          pagination: response.data.pagination || {}
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Billing Invoices'));
        console.log();

        const invoices = response.data.data || response.data.invoices || [];

        if (invoices.length === 0) {
          output.warn('No invoices found');
          return;
        }

        const table = new Table({
          head: ['ID', 'Workspace', 'Plan', 'Amount', 'Currency', 'Status', 'Date'].map(h => chalk.cyan(h)),
          style: { head: [], border: ['grey'] }
        });

        invoices.forEach(invoice => {
          const statusColor = invoice.status === 'paid' ? chalk.green :
                            invoice.status === 'pending' ? chalk.yellow : chalk.red;
          table.push([
            invoice.id,
            invoice.workspace_id || '-',
            invoice.plan_id || '-',
            invoice.amount || '-',
            invoice.currency || '-',
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
      if (options.userId) params.user_id = options.userId;
      if (options.type) params.payment_type = options.type;
      if (options.status) params.status = options.status;

      const response = await api.get('/billing/transactions', { params });

      if (config.outputFormat === 'json') {
        const data = response.data;
        // Handle different response structures
        if (data.transactions && data.transactions.transactions) {
          output.json({
            success: true,
            transactions: data.transactions.transactions,
            pagination: data.transactions.pagination || {},
            summary: data.transactions.summary || {}
          });
        } else if (data.data && Array.isArray(data.data)) {
          output.json({
            success: true,
            transactions: data.data,
            pagination: data.pagination || {}
          });
        } else {
          output.json({
            success: true,
            transactions: [],
            pagination: {},
            summary: {}
          });
        }
      } else {
        console.log();
        console.log(chalk.white.bold('Payment Transactions'));
        console.log();

        let transactions = [];
        if (response.data.transactions && response.data.transactions.transactions) {
          transactions = response.data.transactions.transactions;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          transactions = response.data.data;
        }

        if (transactions.length === 0) {
          output.warn('No transactions found');
          return;
        }

        const table = new Table({
          head: ['ID', 'User', 'Type', 'Amount', 'Currency', 'Status', 'Date'].map(h => chalk.cyan(h)),
          style: { head: [], border: ['grey'] }
        });

        transactions.forEach(tx => {
          const statusColor = tx.status === 'succeeded' ? chalk.green :
                            tx.status === 'pending' ? chalk.yellow : chalk.red;
          table.push([
            tx.id,
            tx.user_id || '-',
            tx.payment_type || tx.type || '-',
            tx.amount || '-',
            tx.currency || '-',
            statusColor(tx.status || '-'),
            tx.transaction_date || tx.created_at || '-'
          ]);
        });

        console.log(table.toString());
        console.log();

        // Show summary if available
        if (response.data.transactions && response.data.transactions.summary) {
          const summary = response.data.transactions.summary;
          console.log(chalk.gray('Summary:'));
          console.log(chalk.gray(`  Total Transactions: ${summary.total_transactions || 0}`));
          console.log(chalk.gray(`  One-time Payments: ${summary.one_time_payments || 0}`));
          console.log(chalk.gray(`  Subscription Payments: ${summary.subscription_payments || 0}`));
          console.log(chalk.gray(`  Total Amount: $${summary.total_amount || 0}`));
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
  }
};
