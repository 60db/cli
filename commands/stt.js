/**
 * STT (Speech-to-Text) Commands Module
 *
 * Handles speech-to-text operations:
 * - Transcribe audio files
 * - List available languages
 */

const chalk = require('chalk');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

module.exports = {
  /**
   * Transcribe audio file
   */
  async transcribe(options, api, output, config) {
    // Check if file exists
    if (!fs.existsSync(options.file)) {
      const error = `File not found: ${options.file}`;
      if (config.outputFormat === 'json') {
        output.json({ success: false, error });
      } else {
        output.error(error);
      }
      return;
    }

    try {
      // Create form data with STT Labs v1 fields
      const form = new FormData();
      form.append('file', fs.createReadStream(options.file));
      // Omit `language` entirely (or pass "auto") to enable auto-detection
      if (options.language && options.language !== 'auto') {
        form.append('language', options.language);
      }
      if (options.diarize === 'true' || options.diarize === true) {
        form.append('diarize', 'true');
      }

      // Forward the optional --context string to the upstream
      // /v1/transcribe endpoint. Free-form paragraph describing the
      // session (domain, speakers, jargon); when supplied, the server
      // runs a background LLM refinement pass on the transcript.
      if (options.context && String(options.context).trim()) {
        form.append('context', String(options.context).trim());
      }

      // Make request with form data
      const response = await api.post('/stt', form, {
        headers: {
          ...form.getHeaders()
        }
      });

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          transcription: response.data,
          file: options.file
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Transcription Result:'));
        console.log();

        console.log(chalk.cyan('File:'), options.file);

        // Handle different response structures
        if (response.data.text) {
          console.log(chalk.cyan('Transcript:'));
          console.log(chalk.white(response.data.text));
        } else if (response.data.transcription) {
          console.log(chalk.cyan('Transcript:'));
          console.log(chalk.white(response.data.transcription));
        } else if (response.data.segments && response.data.segments.length > 0) {
          console.log(chalk.cyan('Segments:'));
          response.data.segments.forEach((seg, i) => {
            console.log(chalk.gray(`  ${i + 1}.`), chalk.white(seg.text || seg.transcript));
          });
        } else {
          console.log(chalk.cyan('Response:'));
          console.log(JSON.stringify(response.data, null, 2));
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
   * List available STT languages
   */
  async languages(options, api, output, config) {
    try {
      const response = await api.get('/stt/languages');

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          languages: response.data.data || response.data.languages || response.data
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Available STT Languages:'));
        console.log();

        const languages = response.data.data || response.data.languages || response.data;

        if (Array.isArray(languages)) {
          if (languages.length === 0) {
            output.warn('No languages available');
            return;
          }

          languages.forEach((lang, index) => {
            if (typeof lang === 'string') {
              console.log(chalk.cyan(`${index + 1}.`), chalk.white(lang));
            } else if (lang.code || lang.language) {
              console.log(chalk.cyan(`${index + 1}.`), chalk.white(lang.name || lang.language_name || lang.code), chalk.gray(`(${lang.code || lang.language})`));
            } else if (lang.name) {
              console.log(chalk.cyan(`${index + 1}.`), chalk.white(lang.name));
            }
          });
        } else if (typeof languages === 'object') {
          Object.entries(languages).forEach(([code, name], index) => {
            console.log(chalk.cyan(`${index + 1}.`), chalk.white(name || code), chalk.gray(`(${code})`));
          });
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
  }
};
