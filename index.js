const { Client, GatewayIntentBits, REST, Routes, WebhookClient } = require('discord.js');
const http = require('http');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 1. Define slash commands
const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'sendwebhook',
        description: 'Sends a test message via webhook',
    }
];

// Register commands with Discord on startup
client.once('ready', async () => {
    console.log(`Bot is online as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

// 2. Listen for command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong! 🏓');
    }

    if (interaction.commandName === 'sendwebhook') {
        // We read the webhook URL safely from Render's Environment Variables
        const webhookUrl = process.env.WEBHOOK_URL;

        if (!webhookUrl) {
            return await interaction.reply({ content: 'Error: WEBHOOK_URL is not configured on Render!', ephemeral: true });
        }

        try {
            const webhookClient = new WebhookClient({ url: webhookUrl });
            await webhookClient.send({
                content: 'Hello! This message is sent via a Discord Webhook! 🚀',
                username: 'FZY Webhook',
                avatarURL: client.user.displayAvatarURL(),
            });
            await interaction.reply({ content: 'Webhook message sent successfully!', ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to send webhook message.', ephemeral: true });
        }
    }
});

// Required web server for Render to stay online
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Webserver listening on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
