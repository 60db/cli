/**
 * TTS (Text-to-Speech) Commands Module
 *
 * Handles text-to-speech operations:
 * - Synthesize speech from text
 * - List available voices
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

module.exports = {
  /**
   * Synthesize speech from text
   */
  async synthesize(options, api, output, config) {
    const synthesizeData = {
      text: options.text,
      voice_id: options.voiceId,
      speed: parseFloat(options.speed) || 1,
      stability: options.stability !== undefined ? parseFloat(options.stability) : 50,
      similarity: options.similarity !== undefined ? parseFloat(options.similarity) : 75
    };

    try {
      const response = await api.post('/tts-synthesize', synthesizeData, {
        responseType: 'arraybuffer'
      });

      // Handle audio response
      let audioData = response.data;

      // If response is JSON with error
      if (response.headers['content-type']?.includes('application/json')) {
        const errorData = JSON.parse(audioData.toString());
        throw new Error(errorData.message || 'TTS synthesis failed');
      }

      // Determine output file
      let outputFile = options.output;
      if (!outputFile) {
        const timestamp = Date.now();
        outputFile = path.join(process.cwd(), `tts_${timestamp}.mp3`);
      }

      // Save audio file
      fs.writeFileSync(outputFile, audioData);

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          outputFile: outputFile,
          size: audioData.length
        });
      } else {
        console.log();
        output.success('Speech synthesized successfully!');
        console.log(chalk.gray('Output file:'), outputFile);
        console.log(chalk.gray('File size:'), `${(audioData.length / 1024).toFixed(2)} KB`);
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
   * List available voices
   */
  async list(options, api, output, config) {
    try {
      const response = await api.get('/voices');

      if (config.outputFormat === 'json') {
        output.json({
          success: true,
          voices: response.data.data || response.data.voices || response.data
        });
      } else {
        console.log();
        console.log(chalk.white.bold('Available Voices:'));
        console.log();

        const voices = response.data.data || response.data.voices || response.data;

        if (Array.isArray(voices)) {
          if (voices.length === 0) {
            output.warn('No voices available');
            return;
          }

          voices.forEach((voice, index) => {
            console.log(chalk.cyan(`${index + 1}.`), chalk.white(voice.name || voice.voice_name || voice.id || 'Unknown'));
            console.log(chalk.gray('   ID:'), voice.id || voice.voice_id || 'N/A');
            if (voice.language) console.log(chalk.gray('   Language:'), voice.language);
            if (voice.gender) console.log(chalk.gray('   Gender:'), voice.gender);
            if (voice.category) console.log(chalk.gray('   Category:'), voice.category);
            console.log();
          });
        } else if (typeof voices === 'object') {
          Object.entries(voices).forEach(([category, voiceList], categoryIndex) => {
            console.log(chalk.yellow(`${categoryIndex + 1}. ${category}:`));
            if (Array.isArray(voiceList)) {
              voiceList.forEach((voice, index) => {
                console.log(chalk.gray(`   ${index + 1}.`), chalk.white(voice.name || voice.voice_name || voice.id));
                if (voice.id || voice.voice_id) console.log(chalk.gray('      ID:'), voice.id || voice.voice_id);
              });
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
