const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`Bot is online als ${client.user.tag}!`);
});

// Dit zorgt ervoor dat Render denkt dat het een website is en de bot online houdt
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Webserver luistert op poort ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
