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
    },
    {
        name: 'changestatus',
        description: 'Admin only: Change the online status of the bot',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            {
                name: 'status',
                description: 'Choose the new status',
                type: 3, 
                required: true,
                choices: [
                    { name: 'Online', value: 'online' },
                    { name: 'Idle', value: 'idle' },
                    { name: 'Do Not Disturb', value: 'dnd' },
                    { name: 'Offline / Invisible', value: 'invisible' }
                ]
            }
        ]
    },
    {
        name: 'changemind',
        description: 'Admin only: Change the custom status text of the bot',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            {
                name: 'text',
                description: 'The new custom status text',
                type: 3, 
                required: true,
            }
        ]
    },
    {
        name: 'listening',
        description: 'Admin only: Set the bot activity to "Listening to..."',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            {
                name: 'song',
                description: 'The name of the song',
                type: 3, // STRING
                required: true,
            },
            {
                name: 'artist',
                description: 'The name of the artist',
                type: 3, // STRING
                required: true,
            }
        ]
    }
];

let currentActivity = {
    name: 'Official Bot of MrFoazy',
    type: ActivityType.Custom
};

// Register commands and set status on startup
client.once('ready', async () => {
    console.log(`Bot is online as ${client.user.tag}!`);

    client.user.setPresence({
        activities: [currentActivity],
        status: 'dnd', 
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
    } catch (error) {
        console.error(`Could not send welcome DM to ${member.user.tag}.`, error);
    }
});

// Spy function: Listen for incoming DM messages
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.channel.type === ChannelType.DM) {
        const adminChannelId = '1547054751542419528';
        
        try {
            const adminChannel = await client.channels.fetch(adminChannelId);
            if (adminChannel) {
                let logMessage = `👁️ **DM Spy:** User **${message.author.tag}** (${message.author.id}) sent a message:\n`;
                if (message.content) logMessage += `> "${message.content}"\n`;
                if (message.attachments.size > 0) {
                    logMessage += `📁 **Attachments:**\n`;
                    message.attachments.forEach(attachment => { logMessage += `${attachment.url}\n`; });
                }
                if (message.mentions.users.size > 0) {
                    logMessage += `👤 **Mentioned Users:** `;
                    const mentions = message.mentions.users.map(u => `**${u.tag}**`).join(', ');
                    logMessage += `${mentions}\n`;
                }
                await adminChannel.send({ content: logMessage });
            }
        } catch (error) {
            console.error('Failed to forward DM to admin channel:', error);
        }
    }
});

// Listen for command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const adminCommands = ['sendcustom', 'changestatus', 'changemind', 'listening'];
    if (adminCommands.includes(interaction.commandName)) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({ content: 'You do not have permission to use this command!', ephemeral: true });
        }

        const allowedChannelId = '1547054751542419528';
        if (interaction.channel.id !== allowedChannelId) {
            return await interaction.reply({ content: `This command can only be executed inside the designated admin channel (<#${allowedChannelId}>)!`, ephemeral: true });
        }
    }

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong! 🏓');
    }

    if (interaction.commandName === 'changestatus') {
        const newStatus = interaction.options.getString('status');
        try {
            client.user.setPresence({
                activities: [currentActivity],
                status: newStatus
            });
            await interaction.reply({ content: `Successfully changed status indicator to **${newStatus}**!`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to update status indicator.', ephemeral: true });
        }
    }

    if (interaction.commandName === 'changemind') {
        const newText = interaction.options.getString('text');
        currentActivity = { name: 'customstatus', type: ActivityType.Custom, state: newText };
        try {
            client.user.setPresence({
                activities: [currentActivity],
                status: client.user.presence.status || 'dnd'
            });
            await interaction.reply({ content: `Successfully changed status text to: "${newText}"`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to update status text.', ephemeral: true });
        }
    }

    // NEW LISTENING COMMAND
    if (interaction.commandName === 'listening') {
        const song = interaction.options.getString('song');
        const artist = interaction.options.getString('artist');
        
        // Change type to Listening (2) and combine song + artist
        currentActivity = { 
            name: `${song} by ${artist}`, 
            type: ActivityType.Listening 
        };

        try {
            client.user.setPresence({
                activities: [currentActivity],
                status: client.user.presence.status || 'dnd'
            });
            await interaction.reply({ content: `The bot is now fake-listening to: **${song}** by **${artist}** 🎵`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to update the listening status.', ephemeral: true });
        }
    }

    if (interaction.commandName === 'sendcustom') {
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

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Webserver listening on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
