const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const http = require('http');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 1. Define the slash command
const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
];

// 2. Register the command with Discord on startup
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

// 3. Listen for the command interaction in Discord
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong! 🏓');
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
