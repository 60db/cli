/**
 * Authorization (Cerbos) Commands
 *
 * 60db enforces access control server-side via Cerbos policies. These
 * commands let users inspect their effective permissions without having
 * to attempt an action and watch for a 403:
 *
 *   60db authz:permissions         — full permission map
 *   60db authz:check RES ACTION    — probe a single (resource, action)
 *
 * Both commands read from GET /authz/permissions and are unbilled.
 */

const chalk = require('chalk');
const Table = require('cli-table3');

module.exports = {
  /**
   * 60db authz:permissions — show everything the caller is allowed to do
   */
  async permissions(options, api, output, config) {
    try {
      const res = await api.get('/authz/permissions');
      const data = res.data?.data || res.data;
      if (config.outputFormat === 'json') {
        output.json({ success: true, data });
        return;
      }
      console.log();
      console.log(chalk.white.bold('Effective permissions'));
      console.log();
      console.log(chalk.gray('Role: ') + chalk.cyan(data.role || 'unknown'));
      console.log(chalk.gray('Tier: ') + chalk.cyan(data.tier || 'unknown'));
      if (data.plan_active === false) {
        console.log(chalk.red('⚠  Plan inactive — some features may be restricted'));
      }
      if (data.credit_balance != null) {
        const balance = Number(data.credit_balance);
        const col = balance < 0.5 ? chalk.red : chalk.green;
        console.log(chalk.gray('Wallet: ') + col('$' + balance.toFixed(4)));
      }
      console.log();

      const perms = data.permissions || {};
      const table = new Table({
        head: ['Resource', 'Allowed actions'].map((h) => chalk.cyan(h)),
        style: { head: [], border: ['grey'] },
        colWidths: [18, 80],
        wordWrap: true,
      });

      const sorted = Object.keys(perms).sort();
      sorted.forEach((resource) => {
        const actions = Object.entries(perms[resource] || {})
          .filter(([, v]) => v === true)
          .map(([a]) => a);
        const deniedCount = Object.values(perms[resource] || {}).filter((v) => v !== true).length;
        let actionStr = actions.length ? actions.join(', ') : chalk.gray('(none)');
        if (deniedCount > 0) {
          actionStr += chalk.gray(`  [+${deniedCount} denied]`);
        }
        table.push([resource, actionStr]);
      });
      console.log(table.toString());
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (config.outputFormat === 'json') {
        output.json({ success: false, error: msg });
      } else {
        output.error(msg);
      }
    }
  },

  /**
   * 60db authz:check — probe a single (resource, action)
   */
  async check(options, api, output, config) {
    if (!options.resource || !options.action) {
      output.error('--resource and --action are required');
      output.info('Example: 60db authz:check --resource memory --action create');
      return;
    }
    try {
      const res = await api.get('/authz/permissions');
      const data = res.data?.data || res.data;
      const perms = data.permissions || {};
      const entry = perms[options.resource] || {};
      const explicit = entry[options.action];
      const allowed = explicit === true;
      const result = {
        resource: options.resource,
        action: options.action,
        allowed,
        role: data.role || null,
        tier: data.tier || null,
        reason:
          explicit === undefined
            ? 'Action not defined in policy — treat as denied'
            : allowed
            ? 'Allowed by policy'
            : 'Denied by policy for this role/tier',
      };
      if (config.outputFormat === 'json') {
        output.json({ success: true, ...result });
      } else {
        console.log();
        console.log(
          chalk.gray('Check: ') +
            chalk.cyan(`${options.resource}:${options.action}`) +
            '  →  ' +
            (allowed ? chalk.green.bold('ALLOWED') : chalk.red.bold('DENIED'))
        );
        console.log(chalk.gray('Role:   ') + (data.role || 'unknown'));
        console.log(chalk.gray('Reason: ') + result.reason);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (config.outputFormat === 'json') {
        output.json({ success: false, error: msg });
      } else {
        output.error(msg);
      }
    }
  },
};
