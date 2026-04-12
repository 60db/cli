/**
 * Memory Commands Module
 *
 * Pay-as-you-go memory/RAG operations:
 *   - ingest: store a single memory
 *   - upload: extract + ingest a document (PDF, DOCX, XLSX, images, etc.)
 *   - search: hybrid semantic + keyword recall
 *   - context: assemble LLM-ready context
 *   - list: show collections
 *   - create: new team/knowledge/hive collection
 *   - usage: monthly spend breakdown
 *   - status: poll a memory's processing state
 *   - delete: soft-delete a memory
 *
 * Every billable response surfaces the x-credit-balance and
 * x-credit-charged headers so users can watch their wallet in real time.
 */

const chalk = require('chalk');
const Table = require('cli-table3');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// ─ Helpers ───────────────────────────────────────────────────

function extractBilling(headers) {
  if (!headers) return null;
  const balance = headers['x-credit-balance'] ? parseFloat(headers['x-credit-balance']) : null;
  const chargedTotal = headers['x-credit-charged-total'] ? parseFloat(headers['x-credit-charged-total']) : null;
  const charged = headers['x-credit-charged'] ? parseFloat(headers['x-credit-charged']) : null;
  const txId = headers['x-billing-tx'] || null;
  if (balance == null && charged == null && !txId) return null;
  return {
    balance: Number.isFinite(balance) ? balance : null,
    charged: chargedTotal ?? (Number.isFinite(charged) ? charged : null),
    txId,
  };
}

function printBillingFooter(billing) {
  if (!billing) return;
  const parts = [];
  if (typeof billing.charged === 'number') {
    parts.push(`charged ${chalk.yellow('$' + billing.charged.toFixed(6))}`);
  }
  if (typeof billing.balance === 'number') {
    const balanceStr = '$' + billing.balance.toFixed(6);
    const color = billing.balance < 0.5 ? chalk.red : chalk.green;
    parts.push(`balance ${color(balanceStr)}`);
  }
  if (billing.txId) {
    parts.push(chalk.gray('tx ' + billing.txId.slice(0, 8) + '...'));
  }
  if (parts.length) {
    console.log();
    console.log(chalk.gray('Billing: ') + parts.join(' · '));
  }
}

function handleErr(err, output, config) {
  const data = err.response?.data;
  if (data?.error_code === 'INSUFFICIENT_CREDITS') {
    if (config.outputFormat === 'json') {
      output.json({
        success: false,
        error: 'INSUFFICIENT_CREDITS',
        details: data.details,
      });
    } else {
      output.error('Insufficient credits in workspace wallet');
      if (data.details) {
        console.log(
          chalk.gray(
            `  required: $${Number(data.details.required || 0).toFixed(6)}  ` +
              `available: $${Number(data.details.available || 0).toFixed(6)}  ` +
              `shortfall: ${chalk.red('$' + Number(data.details.shortfall || 0).toFixed(6))}`
          )
        );
      }
      output.info('Run `60db billing:add-funds --amount 10` to top up your wallet');
    }
    return;
  }
  const msg = data?.message || err.message;
  if (config.outputFormat === 'json') {
    output.json({ success: false, error: msg, code: data?.code });
  } else {
    output.error(msg);
  }
}

// ─ Command implementations ───────────────────────────────────

module.exports = {
  /**
   * 60db memory:ingest — single memory
   */
  async ingest(options, api, output, config) {
    if (!options.text) {
      output.error('--text is required');
      return;
    }
    const body = {
      text: options.text,
      type: options.type || 'user',
      infer: options.infer !== 'false',
    };
    if (options.title) body.title = options.title;
    if (options.collection) body.collection = options.collection;

    try {
      const res = await api.post('/memory/ingest', body);
      const billing = extractBilling(res.headers);
      const data = res.data?.data;
      if (config.outputFormat === 'json') {
        output.json({ success: true, data, billing });
      } else {
        output.success('Memory queued');
        console.log(chalk.gray('Collection: ') + (data?.collection_id || 'personal'));
        console.log(chalk.gray('Type: ') + (data?.memory_type || body.type));
        if (data?.results?.length) {
          console.log(chalk.gray('Memory ID: ') + data.results[0].id);
        }
        printBillingFooter(billing);
      }
    } catch (err) {
      handleErr(err, output, config);
    }
  },

  /**
   * 60db memory:upload — extract + ingest a document
   */
  async upload(options, api, output, config) {
    if (!options.file) {
      output.error('--file is required (path to a document)');
      return;
    }
    const absPath = path.resolve(options.file);
    if (!fs.existsSync(absPath)) {
      output.error(`File not found: ${absPath}`);
      return;
    }
    const stats = fs.statSync(absPath);
    if (stats.size > 200 * 1024 * 1024) {
      output.error(`File is ${(stats.size / 1024 / 1024).toFixed(1)}MB — max is 200MB`);
      return;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(absPath), path.basename(absPath));
    if (options.collection) form.append('collection', options.collection);
    form.append('type', options.type || 'knowledge');
    if (options.title) form.append('title', options.title);
    if (options.chunkSize) form.append('chunk_size', String(options.chunkSize));
    if (options.chunkOverlap) form.append('chunk_overlap', String(options.chunkOverlap));

    try {
      const res = await api.post('/memory/documents/extract', form, {
        headers: form.getHeaders(),
        timeout: 180000,
        maxContentLength: 500 * 1024 * 1024,
        maxBodyLength: 500 * 1024 * 1024,
      });
      const billing = extractBilling(res.headers);
      const data = res.data?.data;
      if (config.outputFormat === 'json') {
        output.json({ success: true, data, billing });
      } else {
        output.success(`Document ingested: ${data?.filename || path.basename(absPath)}`);
        console.log(chalk.gray('Collection: ') + (data?.collection_id || 'personal'));
        console.log(chalk.gray('Chunks: ') + data?.chunks);
        console.log(chalk.gray('Characters: ') + data?.characters);
        if (data?.metadata?.page_count) {
          console.log(chalk.gray('Pages: ') + data.metadata.page_count);
        }
        if (data?.metadata?.detected_languages?.length) {
          console.log(chalk.gray('Languages: ') + data.metadata.detected_languages.join(', '));
        }
        printBillingFooter(billing);
      }
    } catch (err) {
      handleErr(err, output, config);
    }
  },

  /**
   * 60db memory:search — hybrid semantic recall
   */
  async search(options, api, output, config) {
    if (!options.query) {
      output.error('--query is required');
      return;
    }
    const body = {
      query: options.query,
      mode: options.mode || 'fast',
      max_results: parseInt(options.limit) || 10,
      alpha: options.alpha != null ? parseFloat(options.alpha) : 0.8,
      recency_bias: options.recencyBias != null ? parseFloat(options.recencyBias) : 0,
      graph_context: options.graph === true || options.graph === 'true',
    };
    if (options.collection) body.collection = options.collection;
    // Advanced reranker knobs — only include if explicitly set
    if (options.rerankTopK != null) body.rerank_top_k = parseInt(options.rerankTopK);
    if (options.rerankTimeout != null) body.rerank_timeout_ms = parseInt(options.rerankTimeout);
    if (options.minRerankScore != null) body.min_rerank_score = parseFloat(options.minRerankScore);
    if (options.fetchMultiplier != null) body.fetch_multiplier = parseInt(options.fetchMultiplier);

    try {
      const res = await api.post('/memory/search', body);
      const billing = extractBilling(res.headers);
      const data = res.data?.data;
      const sources = data?.sources || [];
      if (config.outputFormat === 'json') {
        output.json({ success: true, data, billing });
      } else {
        const rerankMode = data?.trace?.rerank?.mode || 'off';
        console.log();
        console.log(
          chalk.white.bold(`Found ${sources.length} results`) +
            chalk.gray(` for "${options.query}" (${data?.latency_ms || '?'}ms)`) +
            (rerankMode !== 'off' ? chalk.magenta(` [reranker: ${rerankMode}]`) : '')
        );
        console.log();
        sources.forEach((s, i) => {
          const dense = typeof s.score === 'number' ? s.score.toFixed(3) : '?';
          const rerank = typeof s.rerank_score === 'number' ? chalk.magenta(` rerank=${s.rerank_score.toFixed(4)}`) : '';
          console.log(
            chalk.cyan(`${i + 1}. `) +
              chalk.yellow(`[${dense}]`) +
              rerank +
              (s.title ? chalk.white(' ' + s.title) : '')
          );
          const text = (s.text || '').slice(0, 200);
          console.log(chalk.gray('   ' + text + ((s.text || '').length > 200 ? '…' : '')));
          console.log();
        });
        printBillingFooter(billing);
      }
    } catch (err) {
      handleErr(err, output, config);
    }
  },

  /**
   * 60db memory:context — assemble LLM-ready prompt
   */
  async context(options, api, output, config) {
    if (!options.query) {
      output.error('--query is required');
      return;
    }
    const body = {
      query: options.query,
      top_k: parseInt(options.topK) || 10,
      max_context_length: parseInt(options.maxContextLength) || 4000,
      include_graph: options.graph === true || options.graph === 'true',
      include_timeline: options.timeline !== 'false',
    };
    if (options.sessionId) body.session_id = options.sessionId;

    try {
      const res = await api.post('/memory/context', body);
      const billing = extractBilling(res.headers);
      const data = res.data?.data;
      if (config.outputFormat === 'json') {
        output.json({ success: true, data, billing });
      } else {
        console.log();
        console.log(chalk.white.bold('LLM-ready context'));
        console.log();
        console.log(data?.prompt_ready || chalk.gray('(empty — graceful degradation)'));
        printBillingFooter(billing);
      }
    } catch (err) {
      handleErr(err, output, config);
    }
  },

  /**
   * 60db memory:collections — list
   */
  async listCollections(options, api, output, config) {
    try {
      const res = await api.get('/memory/collections');
      const collections = res.data?.data || [];
      if (config.outputFormat === 'json') {
        output.json({ success: true, collections });
      } else {
        const table = new Table({
          head: ['ID', 'Label', 'Kind', 'Shared'].map((h) => chalk.cyan(h)),
          style: { head: [], border: ['grey'] },
        });
        collections.forEach((c) => {
          table.push([
            c.collection_id,
            c.label || '',
            c.kind,
            c.shared ? 'yes' : 'no',
          ]);
        });
        console.log(table.toString());
      }
    } catch (err) {
      handleErr(err, output, config);
    }
  },

  /**
   * 60db memory:create-collection — new team/knowledge/hive
   */
  async createCollection(options, api, output, config) {
    if (!options.id || !options.label) {
      output.error('--id and --label are required');
      return;
    }
    const body = {
      collection_id: options.id,
      label: options.label,
      kind: options.kind || 'team',
      shared: options.shared !== 'false',
    };
    try {
      const res = await api.post('/memory/collections', body);
      const data = res.data?.data;
      if (config.outputFormat === 'json') {
        output.json({ success: true, collection: data });
      } else {
        output.success(`Collection created: ${data.collection_id}`);
        console.log(chalk.gray('Label: ') + data.label);
        console.log(chalk.gray('Kind: ') + data.kind);
      }
    } catch (err) {
      handleErr(err, output, config);
    }
  },

  /**
   * 60db memory:usage — monthly spend
   */
  async usage(options, api, output, config) {
    const period = options.period || 'current_month';
    try {
      const res = await api.get('/memory/usage', { params: { period } });
      const data = res.data?.data;
      if (config.outputFormat === 'json') {
        output.json({ success: true, data });
      } else {
        console.log();
        console.log(chalk.white.bold(`Memory usage (${data?.period})`));
        if (data?.billing_owner) {
          console.log(
            chalk.gray('Billing owner: ') +
              data.billing_owner.name +
              '  ' +
              chalk.gray('Wallet: ') +
              chalk.green('$' + (data.billing_owner.current_balance_usd || 0).toFixed(6))
          );
        }
        console.log(
          chalk.gray('Total: ') +
            chalk.yellow('$' + (data?.total?.net_spend_usd || 0).toFixed(6)) +
            chalk.gray(` · ${data?.total?.operations || 0} operations · ${data?.total?.refunds || 0} refunds`)
        );
        console.log();
        const byService = data?.by_service || {};
        const table = new Table({
          head: ['Service', 'Net spend', 'Units', 'Ops', 'Refunds'].map((h) => chalk.cyan(h)),
          style: { head: [], border: ['grey'] },
        });
        Object.entries(byService).forEach(([service, info]) => {
          table.push([
            service,
            '$' + Number(info.net_spend_usd || 0).toFixed(6),
            String(info.gross_units || 0),
            String(info.operation_count || 0),
            String(info.refund_count || 0),
          ]);
        });
        if (Object.keys(byService).length > 0) {
          console.log(table.toString());
        } else {
          output.info('No memory operations recorded in this period yet');
        }
      }
    } catch (err) {
      handleErr(err, output, config);
    }
  },

  /**
   * 60db memory:status — poll a memory's processing status
   */
  async status(options, api, output, config) {
    if (!options.id) {
      output.error('--id is required');
      return;
    }
    try {
      const params = options.collection ? { collection: options.collection } : undefined;
      const res = await api.get(`/memory/${encodeURIComponent(options.id)}/status`, { params });
      const data = res.data?.data || res.data;
      if (config.outputFormat === 'json') {
        output.json({ success: true, status: data });
      } else {
        const statusColor =
          data.status === 'ready' ? chalk.green : data.status === 'failed' ? chalk.red : chalk.yellow;
        console.log();
        console.log(chalk.gray('Memory ID: ') + (data.memory_id || options.id));
        console.log(chalk.gray('Status:    ') + statusColor(data.status || 'unknown'));
        if (data.memory_type) console.log(chalk.gray('Type:      ') + data.memory_type);
        if (data.created_at) console.log(chalk.gray('Created:   ') + data.created_at);
        if (data.updated_at) console.log(chalk.gray('Updated:   ') + data.updated_at);
        if (data.error_message) console.log(chalk.red('Error: ') + data.error_message);
      }
    } catch (err) {
      handleErr(err, output, config);
    }
  },

  /**
   * 60db memory:delete — soft-delete with 24h undo
   */
  async delete(options, api, output, config) {
    if (!options.id) {
      output.error('--id is required');
      return;
    }
    try {
      const params = { type: options.type || 'user' };
      if (options.collection) params.collection = options.collection;
      await api.delete(`/memory/${encodeURIComponent(options.id)}`, { params });
      if (config.outputFormat === 'json') {
        output.json({ success: true, id: options.id });
      } else {
        output.success(`Memory deleted: ${options.id}`);
        output.info('Undoable for 24h');
      }
    } catch (err) {
      handleErr(err, output, config);
    }
  },
};
