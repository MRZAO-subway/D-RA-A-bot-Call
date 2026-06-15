/**
 * Discord AFK Voice Bot - 24/7
 * 
 * Lightweight bot that stays in a voice channel indefinitely.
 * Designed to run on minimal server resources via Docker.
 * 
 * Dependencies:
 *   - discord.js (Discord API)
 *   - @discordjs/voice (Voice connections + DAVE E2EE)
 *   - opusscript (Opus codec, pure JS - no native build)
 *   - dotenv (loads .env file for local development)
 */

require('dotenv/config');

const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { VoiceManager } = require('./voice');
const { logger } = require('./logger');

// --- Validate Environment ---

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const RECONNECT_DELAY = parseInt(process.env.RECONNECT_DELAY, 10) || 5000;

if (!DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN is not set. Check your .env file.');
  process.exit(1);
}

if (!VOICE_CHANNEL_ID) {
  logger.error('VOICE_CHANNEL_ID is not set. Check your .env file.');
  process.exit(1);
}

// --- Create Client ---

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

let voiceManager = null;
let shuttingDown = false;

// --- Bot Ready ---

client.once('ready', async () => {
  logger.info('Logged in as ' + client.user.tag);
  logger.info('Serving ' + client.guilds.cache.size + ' guild(s)');

  client.user.setActivity('AFK in Voice', { type: ActivityType.Custom });

  try {
    voiceManager = new VoiceManager(client, VOICE_CHANNEL_ID, RECONNECT_DELAY);
    await voiceManager.connect();
    logger.info('Bot is now AFK in voice channel 24/7');
  } catch (err) {
    logger.error('Failed to join voice channel: ' + err.message);
    process.exit(1);
  }
});

// --- Error Handling ---

client.on('error', (err) => {
  logger.error('Client error: ' + err.message);
});

client.on('warn', (msg) => {
  logger.warn('Client warning: ' + msg);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  if (shuttingDown) return;
  if (oldState.member?.id !== client.user?.id) return;

  if (oldState.channelId && !newState.channelId) {
    logger.warn('Bot was disconnected from voice channel');

    setTimeout(async () => {
      if (shuttingDown) return;
      try {
        if (voiceManager) {
          voiceManager.destroy();
        }
        voiceManager = new VoiceManager(client, VOICE_CHANNEL_ID, RECONNECT_DELAY);
        await voiceManager.connect();
        logger.info('Rejoined voice channel after being disconnected');
      } catch (err) {
        logger.error('Failed to rejoin after disconnect: ' + err.message);
      }
    }, RECONNECT_DELAY);
  }
});

// --- Graceful Shutdown ---

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info('Received ' + signal + '. Shutting down...');

  // Force exit after 5 seconds if graceful shutdown hangs
  const forceExit = setTimeout(() => {
    logger.error('Forced exit after timeout.');
    process.exit(1);
  }, 5000);
  forceExit.unref();

  try {
    if (voiceManager) {
      logger.info('Closing voice connection...');
      voiceManager.destroy();
      // Give it time to send the leave packet
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (err) {
    logger.error('Error during voice manager shutdown: ' + err.message);
  }

  try {
    logger.info('Closing Discord client...');
    client.destroy();
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (err) {
    logger.error('Error during client destruction: ' + err.message);
  }

  logger.info('Bot has been shut down.');
  clearTimeout(forceExit);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Windows: Ctrl+C through npm doesn't always forward SIGINT to the child process.
// readline catches it at the console level and re-emits it.
if (process.platform === 'win32') {
  const rl = require('readline').createInterface({ input: process.stdin });
  rl.on('SIGINT', () => process.emit('SIGINT'));
  // Also exit if stdin closes (npm parent died)
  rl.on('close', () => shutdown('stdin-close'));
}

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  shutdown('uncaughtException');
});

// --- Login ---

logger.info('Starting Discord AFK Voice Bot...');
client.login(DISCORD_TOKEN);
