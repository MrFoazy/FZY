const { Client, GatewayIntentBits, REST, Routes, WebhookClient, PermissionFlagsBits, ChannelType, Partials, ActivityType } = require('discord.js');
const http = require('http');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages, 
        GatewayIntentBits.MessageContent 
    ],
    partials: [
        Partials.Channel, 
        Partials.Message
    ]
});

// Define slash commands
const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'sendwebhook',
        description: 'Sends a test message via webhook and DMs you',
    },
    {
        name: 'sendcustom',
        description: 'Admin only: Send a custom DM to any user (Must be used in designated admin channel)',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            {
                name: 'user',
                description: 'The user you want to send a DM to',
                type: 6, 
                required: true,
            },
            {
                name: 'message',
                description: 'The custom text you want to send',
                type: 3, 
                required: true,
            }
        ]
    }
];

// Register commands and set status on startup
client.once('ready', async () => {
    console.log(`Bot is online as ${client.user.tag}!`);

    // 1. Set Status to Do Not Disturb and Custom Activity Text
    client.user.setPresence({
        activities: [{ 
            name: 'customstatus', 
            type: ActivityType.Custom, 
            state: 'Official Bot of MrFoazy' 
        }],
        status: 'dnd', // 'dnd' stands for Do Not Disturb (Red circle)
    });

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

// Welcome DM when someone joins the server
client.on('guildMemberAdd', async member => {
    try {
        await member.send(`Welcome to **${member.guild.name}**, ${member.user.username}! 🎉 We hope you have a great time here!`);
        console.log(`Successfully sent a welcome DM to ${member.user.tag}`);
    } catch (error) {
        console.error(`Could not send welcome DM to ${member.user.tag}.`, error);
    }
});

// Spy function: Listen for incoming DM messages and forward text, links, and images
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.channel.type === ChannelType.DM) {
        const adminChannelId = '1547054751542419528';
        
        try {
            const adminChannel = await client.channels.fetch(adminChannelId);
            if (adminChannel) {
                let logMessage = `👁️ **DM Spy:** User **${message.author.tag}** (${message.author.id}) sent a message:\n`;
                
                if (message.content) {
                    logMessage += `> "${message.content}"\n`;
                }

                if (message.attachments.size > 0) {
                    logMessage += `📁 **Attachments:**\n`;
                    message.attachments.forEach(attachment => {
                        logMessage += `${attachment.url}\n`;
                    });
                }

                if (message.mentions.users.size > 0) {
                    logMessage += `👤 **Mentioned Users:** `;
                    const mentions = message.mentions.users.map(u => `**${u.tag}**`).join(', ');
                    logMessage += `${mentions}\n`;
                }

                await adminChannel.send({ content: logMessage });
                console.log(`Forwarded comprehensive DM from ${message.author.tag} to admin channel.`);
            }
        } catch (error) {
            console.error('Failed to forward DM to admin channel:', error);
        }
    }
});

// Listen for command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong! 🏓');
    }

    if (interaction.commandName === 'sendwebhook') {
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
            await interaction.reply({ content: 'Webhook message sent and DM dispatched!', ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to execute command.', ephemeral: true });
        }
    }

    if (interaction.commandName === 'sendcustom') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
        }

        const allowedChannelId = '1547054751542419528';
        if (interaction.channel.id !== allowedChannelId) {
            return await interaction.reply({ content: `This command can only be executed inside the designated admin channel (<#${allowedChannelId}>)!`, ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const customMessage = interaction.options.getString('message');

        try {
            await interaction.reply({ content: `Sending your message to **${targetUser.username}**...`, ephemeral: true });
            await targetUser.send(`You received a custom message from an Admin in **${interaction.guild.name}**:\n\n"${customMessage}"`);
            await interaction.editReply({ content: `Successfully sent the DM to **${targetUser.username}**! 📫` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `Failed to send DM to **${targetUser.username}**. Their DMs might be closed!` });
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
