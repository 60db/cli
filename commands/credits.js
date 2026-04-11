/**
 * Credits Commands Module
 *
 * Handles credit operations:
 * - Add credits (TTS, STT, voice limit, wallet amount)
 * - Get user balance
 * - Get transaction history
 */

const chalk = require('chalk');
const Table = require('cli-table3');

module.exports = {
  /**
   * Add credits to user
   */
  async add(options, api, output, config) {
    const creditData = {
      user_id: parseInt(options.userId),
      tts_chars_bonus: parseInt(options.tts) || 0,
      stt_minutes_bonus: parseFloat(options.stt) || 0,
      voice_limit_bonus: parseInt(options.voice) || 0,
      description: options.description || 'Credits added via CLI'
    };

    // Add wallet amount if provided
    if (options.amount) {
      creditData.amount = parseFloat(options.amount);
      creditData.currency = options.currency || 'USD';
    }

    try {
      const response = await api.post('/super-admin/credits', creditData);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          data: response.data.data || response.data
        });
      } else {
        output.success('Credits added successfully');
        console.log(chalk.gray('Transaction ID:'), response.data.data?.id || response.data.id);
        console.log(chalk.gray('TTS Characters:'), creditData.tts_chars_bonus);
        console.log(chalk.gray('STT Minutes:'), creditData.stt_minutes_bonus);
        console.log(chalk.gray('Voice Limit:'), creditData.voice_limit_bonus);
        if (creditData.amount) {
          console.log(chalk.gray('Wallet Amount:'), `${creditData.amount} ${creditData.currency}`);
        }
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
   * Get user credit balance
   */
  async balance(options, api, output, config) {
    try {
      const response = await api.get(`/users/${options.userId}/balance`);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          balance: response.data.data || response.data
        });
      } else {
        const balance = response.data.data || response.data;
        console.log();
        console.log(chalk.white.bold('User Credit Balance'));
        console.log();
        console.log(chalk.cyan('User ID:'), options.userId);
        console.log(chalk.cyan('TTS Characters:'), balance.tts_chars || balance.tts_characters || 0);
        console.log(chalk.cyan('STT Minutes:'), balance.stt_minutes || 0);
        console.log(chalk.cyan('Voice Limit:'), balance.voice_limit || 0);
        console.log(chalk.cyan('Wallet Balance:'), balance.wallet_balance || '$0.00');
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
      const params = { limit: parseInt(options.limit) || 20 };
      const response = await api.get(`/users/${options.userId}/transactions`, { params });

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          transactions: response.data.data || response.data.transactions || [],
          pagination: response.data.pagination || {}
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Credit Transaction History'));
        console.log();

        const transactions = response.data.data || response.data.transactions || [];

        if (transactions.length === 0) {
          output.warn('No transactions found');
          return;
        }

        const table = new Table({
          head: ['ID', 'Type', 'TTS', 'STT', 'Voice', 'Description', 'Date'].map(h => chalk.cyan(h)),
          style: { head: [], border: ['grey'] }
        });

        transactions.forEach(tx => {
          table.push([
            tx.id,
            tx.type || 'Credit',
            tx.tts_chars_bonus || tx.tts_chars || 0,
            tx.stt_minutes_bonus || tx.stt_minutes || 0,
            tx.voice_limit_bonus || tx.voice_limit || 0,
            (tx.description || '-').substring(0, 20),
            tx.created_at || '-'
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
