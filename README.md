<div align="center">

# Discord AFK Voice Bot

**Lightweight 24/7 Discord voice channel bot**

Stay in a voice channel forever. Built for minimal resource usage.

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## Features

- **24/7 Voice Presence** - Bot joins and stays in a voice channel indefinitely
- **Lightweight** - ~70MB Docker image, <60MB RAM usage
- **Auto Reconnect** - Automatically rejoins if disconnected or kicked
- **Docker Ready** - One command to deploy with resource limits
- **Secure** - Runs as non-root user in Docker, self-deafened
- **DAVE E2EE** - Supports Discord's mandatory End-to-End Encryption protocol
- **Zero Native Dependencies** - Pure JS libs, no build tools needed
- **Low-Spec Friendly** - Runs on servers with 256MB RAM / 1 vCPU

## Prerequisites

- [Node.js 20+](https://nodejs.org/) (for local development)
- [Docker & Docker Compose](https://docs.docker.com/get-docker/) (for deployment)
- A [Discord Bot Token](https://discord.com/developers/applications)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/ditzakira/discord-afk-voice-bot.git
cd discord-afk-voice-bot
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
DISCORD_TOKEN=your_bot_token_here
VOICE_CHANNEL_ID=your_voice_channel_id_here
```

### 3. Deploy with Docker (Recommended)

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### 4. Or run locally

```bash
npm install
npm start
```

## Getting Your Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** and give it a name
3. Go to **Bot** > Click **"Reset Token"** > Copy the token
4. Under **Privileged Gateway Intents**, make sure you do NOT need any (this bot uses none)
5. Go to **OAuth2** > **URL Generator**
   - Scopes: `bot`
   - Bot Permissions: `Connect`, `Speak`
6. Copy the generated URL and invite the bot to your server

## Getting Voice Channel ID

1. Open Discord **Settings** > **Advanced** > Enable **Developer Mode**
2. Right-click the voice channel > **Copy Channel ID**

## Project Structure

```
discord-afk-voice-bot/
├── src/
│   ├── index.js        # Main entry point
│   ├── voice.js        # Voice connection manager
│   ├── silence.js      # Opus silence stream
│   └── logger.js       # Lightweight logger
├── Dockerfile          # Multi-stage Alpine build
├── docker-compose.yml  # Production deployment config
├── package.json        # Dependencies
├── .env.example        # Environment template
├── .gitignore
├── .dockerignore
├── LICENSE
└── README.md
```

## Environment Variables

| Variable           | Required | Default | Description                              |
| ------------------ | -------- | ------- | ---------------------------------------- |
| `DISCORD_TOKEN`    | Yes      | -       | Your Discord bot token                   |
| `VOICE_CHANNEL_ID` | Yes      | -       | Target voice channel ID                  |
| `RECONNECT_DELAY`  | No       | `5000`  | Reconnect delay in ms                    |
| `LOG_LEVEL`        | No       | `info`  | Log level: `debug` `info` `warn` `error` |

## Resource Usage

| Metric            | Value                    |
| ----------------- | ------------------------ |
| Docker Image Size | ~70 MB                   |
| RAM Usage         | ~40-60 MB                |
| CPU Usage         | <1%                      |
| Network           | ~1 KB/s (silence frames) |
| Docker Limit      | 128 MB RAM / 0.25 CPU    |

## Development

```bash
# Install dependencies
npm install

# Run with auto-reload (Node.js 20+)
npm run dev

# Run normally
npm start
```

## Docker Commands

```bash
# Build image
docker compose build

# Start in background
docker compose up -d

# View real-time logs
docker compose logs -f

# Restart bot
docker compose restart

# Stop and remove
docker compose down

# Rebuild after changes
docker compose up -d --build
```

## Troubleshooting

| Issue                   | Solution                                             |
| ----------------------- | ---------------------------------------------------- |
| Bot doesn't join        | Check `VOICE_CHANNEL_ID` is correct                  |
| `DISCORD_TOKEN` error   | Regenerate token in Developer Portal                 |
| Bot keeps disconnecting | Check internet stability, increase `RECONNECT_DELAY` |
| Permission denied       | Ensure bot has `Connect` + `Speak` permissions       |
| Docker build fails      | Make sure Docker is installed and running            |

## License

This project is licensed under the [MIT License](LICENSE).
