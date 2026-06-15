const { Readable } = require('stream');

/**
 * Creates a readable stream that outputs Opus silence frames.
 * This keeps the voice connection alive without using any bandwidth.
 * 
 * Opus silence frame: 0xF8 0xFF 0xFE (3 bytes)
 * Sent every 20ms (50 frames/sec) to maintain the connection.
 */
class SilenceStream extends Readable {
  constructor() {
    super();
    // Opus silence frame
    this.silenceFrame = Buffer.from([0xF8, 0xFF, 0xFE]);
  }

  _read() {
    this.push(this.silenceFrame);
    // Throttle to avoid excessive CPU usage
    // discord.js handles the actual 20ms timing
  }

  _destroy(err, callback) {
    callback(err);
  }
}

module.exports = { SilenceStream };
