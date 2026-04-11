/**
 * Categories Commands Module
 *
 * Handles category operations:
 * - List available categories
 */

const chalk = require('chalk');

module.exports = {
  /**
   * List available categories
   */
  async list(options, api, output, config) {
    try {
      const response = await api.get('/categories');

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          categories: response.data.data || response.data.categories || response.data
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Available Categories:'));
        console.log();

        const categories = response.data.data || response.data.categories || response.data;

        if (Array.isArray(categories)) {
          if (categories.length === 0) {
            output.warn('No categories available');
            return;
          }

          categories.forEach((category, index) => {
            if (typeof category === 'string') {
              console.log(chalk.cyan(`${index + 1}.`), chalk.white(category));
            } else if (category.name || category.category_name) {
              console.log(chalk.cyan(`${index + 1}.`), chalk.white(category.name || category.category_name));
              if (category.id) console.log(chalk.gray('   ID:'), category.id);
              if (category.description) console.log(chalk.gray('   Description:'), category.description);
            } else if (category.id) {
              console.log(chalk.cyan(`${index + 1}.`), chalk.white(category.id));
            }
            console.log();
          });
        } else if (typeof categories === 'object') {
          Object.entries(categories).forEach(([key, value], index) => {
            console.log(chalk.cyan(`${index + 1}.`), chalk.white(key));
            if (typeof value === 'string') {
              console.log(chalk.gray('   '), value);
            }
            console.log();
          });
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
