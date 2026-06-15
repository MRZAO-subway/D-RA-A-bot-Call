const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  StreamType,
} = require('@discordjs/voice');
const { SilenceStream } = require('./silence');
const { logger } = require('./logger');

/**
 * Manages the voice connection lifecycle:
 * - Joins a voice channel
 * - Plays silence to stay connected
 * - Auto-reconnects on disconnection
 */
class VoiceManager {
  constructor(client, channelId, reconnectDelay = 5000) {
    this.client = client;
    this.channelId = channelId;
    this.reconnectDelay = reconnectDelay;
    this.connection = null;
    this.player = null;
    this.isDestroyed = false;
  }

  /**
   * Connect to the voice channel and start playing silence.
   */
  async connect() {
    const channel = await this.client.channels.fetch(this.channelId);

    if (!channel) {
      throw new Error(`Channel ${this.channelId} not found.`);
    }

    if (!channel.isVoiceBased()) {
      throw new Error(`Channel ${this.channelId} is not a voice channel.`);
    }

    logger.info(`Joining voice channel: ${channel.name} (${channel.id})`);
    logger.info(`Guild: ${channel.guild.name} (${channel.guild.id})`);

    // Create voice connection
    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,   // Deaf to save resources
      selfMute: false,   // Must not be muted to send silence
    });

    // Create audio player with idle behavior set to keep playing
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    // Play silence
    this._playSilence();

    // Subscribe the connection to the player
    this.connection.subscribe(this.player);

    // Handle connection state changes
    this._setupConnectionListeners();
    this._setupPlayerListeners();

    // Wait for the connection to be ready
    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
      logger.info('Voice connection established.');
    } catch (err) {
      logger.error('Failed to connect within 30 seconds:', err.message);
      this.connection.destroy();
      throw err;
    }
  }

  /**
   * Play a silence stream as an audio resource.
   */
  _playSilence() {
    const silenceStream = new SilenceStream();
    const resource = createAudioResource(silenceStream, {
      inputType: StreamType.Opus,
    });
    this.player.play(resource);
    logger.debug('Playing silence stream');
  }

  /**
   * Setup listeners for voice connection state changes.
   */
  _setupConnectionListeners() {
    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      if (this.isDestroyed) return;

      logger.warn('Voice connection disconnected. Attempting to reconnect...');

      try {
        // Try to reconnect (Discord might just be moving the bot)
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        logger.info('Reconnecting...');
      } catch {
        // Connection is truly lost, destroy and rejoin
        logger.warn('Connection lost. Rejoining in ' + this.reconnectDelay + 'ms...');
        this.connection.destroy();
        await this._delayedReconnect();
      }
    });

    this.connection.on(VoiceConnectionStatus.Destroyed, () => {
      logger.debug('Voice connection destroyed');
    });

    this.connection.on(VoiceConnectionStatus.Ready, () => {
      logger.debug('Voice connection is ready');
    });

    // Handle errors
    this.connection.on('error', (err) => {
      logger.error('Voice connection error:', err.message);
    });
  }

  /**
   * Setup listeners for audio player state changes.
   */
  _setupPlayerListeners() {
    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.isDestroyed) return;
      logger.debug('Player went idle, restarting silence...');
      this._playSilence();
    });

    this.player.on('error', (err) => {
      logger.error('Audio player error:', err.message);
      if (!this.isDestroyed) {
        this._playSilence();
      }
    });
  }

  /**
   * Wait and then try to reconnect.
   */
  async _delayedReconnect() {
    if (this.isDestroyed) return;

    await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));

    if (this.isDestroyed) return;

    try {
      logger.info('Attempting to rejoin voice channel...');
      await this.connect();
    } catch (err) {
      logger.error('Rejoin failed:', err.message);
      // Try again after delay
      await this._delayedReconnect();
    }
  }

  /**
   * Disconnect and cleanup.
   */
  destroy() {
    this.isDestroyed = true;
    if (this.player) {
      this.player.stop(true);
    }
    if (this.connection) {
      this.connection.destroy();
    }
    logger.info('Voice manager destroyed');
  }
}

module.exports = { VoiceManager };
