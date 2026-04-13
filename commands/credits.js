/**
 * Credits Commands Module
 *
 * Handles credit operations:
 * - Add credits (bonus credits + workspace wallet amount)
 * - Get workspace balance
 * - Get transaction history
 */

const chalk = require('chalk');
const Table = require('cli-table3');

module.exports = {
  /**
   * Add credits to workspace (bonus credits and/or wallet amount)
   */
  async add(options, api, output, config) {
    // Validate at least one credit type or amount is provided
    const hasBonusCredits = options.tts > 0 || options.stt > 0 || options.voice > 0;
    const hasAmount = options.amount > 0;

    if (!hasBonusCredits && !hasAmount) {
      output.error('At least one credit type (--tts, --stt, --voice) or --amount must be specified');
      return;
    }

    const creditData = {
      user_id: parseInt(options.userId),
      workspace_id: options.workspaceId ? parseInt(options.workspaceId) : undefined,
      tts_chars: parseInt(options.tts) || 0,
      stt_minutes: parseInt(options.stt) || 0,
      voice_limit: parseInt(options.voice) || 0,
      amount: parseFloat(options.amount) || 0,
      description: options.description || 'Credits added via CLI'
    };

    try {
      const response = await api.post('/super-admin/add-credits', creditData);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          data: response.data.data
        });
      } else {
        console.log();
        output.success('Credits added successfully!');
        console.log();

        const result = response.data.data;

        // Display bonus credits if added
        if (result.bonus_credits) {
          console.log(chalk.cyan('Bonus Credits:'));
          const bonusTable = new Table({
            head: ['Type', 'Amount'].map(h => chalk.white(h)),
            style: { head: [], border: ['grey'] }
          });
          if (result.bonus_credits.tts_chars_bonus > 0) {
            bonusTable.push(['TTS Characters', result.bonus_credits.tts_chars_bonus]);
          }
          if (result.bonus_credits.stt_minutes_bonus > 0) {
            bonusTable.push(['STT Minutes', result.bonus_credits.stt_minutes_bonus]);
          }
          if (result.bonus_credits.voice_limit_bonus > 0) {
            bonusTable.push(['Voice Limit', result.bonus_credits.voice_limit_bonus]);
          }
          console.log(bonusTable.toString());
          console.log();
        }

        // Display wallet amount if added
        if (result.amount_added) {
          console.log(chalk.cyan('Workspace Wallet:'));
          const amountTable = new Table({
            head: ['Field', 'Value'].map(h => chalk.white(h)),
            style: { head: [], border: ['grey'] }
          });
          amountTable.push(['Workspace', result.amount_added.workspace_id || '-']);
          amountTable.push(['Amount Added', `$${result.amount_added.amount}`]);
          amountTable.push(['Previous Balance', `$${result.amount_added.previous_balance}`]);
          amountTable.push(['New Balance', chalk.green(`$${result.amount_added.new_balance}`)]);
          console.log(amountTable.toString());
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
   * Get user credit balance
   */
  async balance(options, api, output, config) {
    try {
      const response = await api.get(`/users/${options.userId}/balance`);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          balance: response.data.data
        });
      } else {
        const balance = response.data.data;
        console.log();
        console.log(chalk.white.bold('Credit Balance'));
        console.log();
        console.log(chalk.cyan('User ID:'), balance.user_id);
        console.log(chalk.cyan('Wallet Balance:'), chalk.green(`$${balance.amount || 0}`));
        console.log(chalk.cyan('TTS Characters:'), balance.tts_chars_bonus || 0);
        console.log(chalk.cyan('STT Minutes:'), balance.stt_minutes_bonus || 0);
        console.log(chalk.cyan('Voice Limit:'), balance.voice_limit_bonus || 0);
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
   * Get credit transaction history
   */
  async history(options, api, output, config) {
    try {
      const response = await api.get(`/users/${options.userId}/transactions`, {
        params: { limit: parseInt(options.limit) || 20 }
      });

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          transactions: response.data.data
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Transaction History'));
        console.log();

        if (response.data.data.length === 0) {
          output.warn('No transactions found');
          return;
        }

        const table = new Table({
          head: ['Date', 'Type', 'Amount', 'Balance Before', 'Balance After', 'Description'].map(h => chalk.cyan(h)),
          style: { head: [], border: ['grey'] },
          colWidths: [20, 15, 12, 15, 15, 30]
        });

        response.data.data.forEach(tx => {
          table.push([
            tx.transaction_date || tx.created_at,
            tx.payment_type || '-',
            `$${tx.amount || 0}`,
            `$${tx.balance_before || 0}`,
            `$${tx.balance_after || 0}`,
            (tx.description || '-').substring(0, 28)
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
