/**
 * Completions Commands Module
 *
 * Handles AI completion operations:
 * - Chat completions
 * - Text completions
 * - Stream completions
 */

const chalk = require('chalk');
const Table = require('cli-table3');

module.exports = {
  /**
   * Handle chat completions
   */
  async chat(options, api, output, config) {
    const requestData = {
      model: options.model || 'qcall/slm-3b-int4',
      messages: [],
      max_tokens: parseInt(options.maxTokens) || 2048,
      temperature: parseFloat(options.temperature) || 0.1,
      top_k: parseInt(options.topK) || 5,
      top_p: parseFloat(options.topP) || 0.9,
      stream: options.stream === 'true' || false,
      chat_template_kwargs: {
        enable_thinking: options.enableThinking === 'true' || false
      }
    };

    // Parse system message
    if (options.system) {
      requestData.messages.push({
        role: 'system',
        content: options.system
      });
    }

    // Parse user prompt
    if (options.prompt) {
      requestData.messages.push({
        role: 'user',
        content: options.prompt
      });
    }

    // Parse messages from file or JSON string
    if (options.messages) {
      try {
        const messages = JSON.parse(options.messages);
        requestData.messages = messages;
      } catch (e) {
        // If not JSON, treat as single user message
        requestData.messages.push({
          role: 'user',
          content: options.messages
        });
      }
    }

    try {
      const response = await api.post('/60db/completions', requestData);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          response: response.data
        });
      } else {
        console.log();
        console.log(chalk.white.bold('AI Completion Response'));
        console.log();

        // Handle different response structures
        let content = '';
        let usage = null;

        if (response.data.choices && response.data.choices.length > 0) {
          content = response.data.choices[0].message?.content || response.data.choices[0].text;
          usage = response.data.usage;
        } else if (response.data.message) {
          content = response.data.message.content;
        } else if (response.data.content) {
          content = response.data.content;
        } else if (typeof response.data === 'string') {
          content = response.data;
        }

        console.log(chalk.cyan('Response:'));
        console.log(content);
        console.log();

        if (usage) {
          console.log(chalk.gray('Usage:'));
          console.log(chalk.gray(`  Prompt Tokens: ${usage.prompt_tokens || '-'}`));
          console.log(chalk.gray(`  Completion Tokens: ${usage.completion_tokens || '-'}`));
          console.log(chalk.gray(`  Total Tokens: ${usage.total_tokens || '-'}`));
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
   * Handle text completions
   */
  async text(options, api, output, config) {
    const requestData = {
      model: options.model || 'qcall/slm-3b-int4',
      prompt: options.prompt || '',
      max_tokens: parseInt(options.maxTokens) || 2048,
      temperature: parseFloat(options.temperature) || 0.1,
      stream: options.stream === 'true' || false
    };

    try {
      const response = await api.post('/60db/completions', requestData);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          response: response.data
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Text Completion'));
        console.log();

        let content = '';
        if (response.data.choices && response.data.choices.length > 0) {
          content = response.data.choices[0].text;
        } else if (response.data.text) {
          content = response.data.text;
        }

        console.log(chalk.cyan('Result:'));
        console.log(content);
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
   * Handle meeting notes analysis
   */
  async meeting(options, api, output, config) {
    const systemPrompt = options.system || 'You are an expert meeting notes assistant. You extract key information from meeting transcripts and output ONLY valid JSON. Never include markdown formatting, code fences, or explanatory text — just the raw JSON object.';

    const userPrompt = `Analyze this meeting transcript and produce structured notes as JSON.

Meeting: "${options.title || 'Meeting'}"

RULES:
1. Output ONLY a valid JSON object — no markdown, no explanation, no wrapping
2. Be specific and actionable — avoid vague summaries
3. Extract real names when mentioned; use "Unassigned" only when truly unclear
4. Capture technical details, numbers, dates, and deadlines mentioned

JSON schema:
{
  "summary": "2-4 sentence executive summary covering purpose, outcome, and next steps",
  "key_points": ["specific discussion point with context"],
  "action_items": [{"task": "specific actionable task with deadline if mentioned", "assignee": "person name or Unassigned"}],
  "decisions": ["specific decision made with rationale if given"]
}

Transcript:
${options.transcript || options.prompt || ''}`;

    const requestData = {
      model: options.model || 'qcall/slm-3b-int4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: parseInt(options.maxTokens) || 2048,
      temperature: parseFloat(options.temperature) || 0.1,
      top_k: parseInt(options.topK) || 5,
      top_p: parseFloat(options.topP) || 0.9,
      chat_template_kwargs: {
        enable_thinking: options.enableThinking === 'true' || false
      },
      stream: false
    };

    try {
      const response = await api.post('/60db/completions', requestData);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          response: response.data
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Meeting Notes Analysis'));
        console.log();

        let content = '';
        if (response.data.choices && response.data.choices.length > 0) {
          content = response.data.choices[0].message?.content || response.data.choices[0].text;
        } else if (response.data.message) {
          content = response.data.message.content;
        } else if (response.data.content) {
          content = response.data.content;
        }

        // Try to parse and format as JSON
        try {
          const jsonContent = JSON.parse(content);
          console.log(chalk.cyan('Summary:'));
          console.log(jsonContent.summary || 'No summary available');
          console.log();

          if (jsonContent.key_points && jsonContent.key_points.length > 0) {
            console.log(chalk.cyan('Key Points:'));
            jsonContent.key_points.forEach((point, i) => {
              console.log(chalk.gray(`  ${i + 1}.`) + ' ' + point);
            });
            console.log();
          }

          if (jsonContent.action_items && jsonContent.action_items.length > 0) {
            console.log(chalk.cyan('Action Items:'));
            const table = new Table({
              head: ['Task', 'Assignee'].map(h => chalk.cyan(h)),
              style: { head: [], border: ['grey'] }
            });
            jsonContent.action_items.forEach(item => {
              table.push([
                (item.task || '-').substring(0, 50),
                item.assignee || 'Unassigned'
              ]);
            });
            console.log(table.toString());
            console.log();
          }

          if (jsonContent.decisions && jsonContent.decisions.length > 0) {
            console.log(chalk.cyan('Decisions:'));
            jsonContent.decisions.forEach((decision, i) => {
              console.log(chalk.gray(`  ${i + 1}.`) + ' ' + decision);
            });
            console.log();
          }
        } catch (e) {
          // Not valid JSON, just print the content
          console.log(chalk.cyan('Response:'));
          console.log(content);
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
