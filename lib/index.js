import { Command } from 'commander';
import WebSocket from 'ws';
const program = new Command();

program
	.name('create-discord-guild')
	.version('1.1.0')
	.requiredOption('-t, --bot-token <token>', 'Set the Discord bot token')
	.option('-i, --owner-id <id>', ' Set the Discord bot token. If not specified, use bot owner')
	.option('-n, --guild-name <name>', 'Set the guild name')
	.option('-c, --admin-role-color <color>', 'Set the admin role color')
	.option('-r, --admin-role-name <name>', 'Set the admin role name')
	.option(
		'-h, --admin-role-hoist <bool>',
		'Whether to hoist the admin role or not'
	)
	.option('-m, --admin-role-mentionable <bool>')
	.option('-e --admin-role-emoji <emoji>', 'Admin role emoji (unicode)')
	.parse(process.argv);

const inputOptions = program.opts();
const options = {
	botToken: inputOptions.botToken,
	ownerId: inputOptions.ownerId,
	guildName: inputOptions.guildName ?? 'Bot Guild',
	adminRoleName: inputOptions.adminRoleName ?? 'Admin',
	adminRoleColor: inputOptions.adminRoleColor ?? '#99AAB5',
	adminRoleEmoji: inputOptions.adminRoleEmoji ?? null,
	adminRoleMentionable: inputOptions.adminRoleMentionable ?? false,
	adminRoleHoist: inputOptions.adminRoleHoist ?? false,
};

const API_VERSION = 10;
const API_BASE = `https://discord.com/api/v${API_VERSION}`;
const REQUIRED_INTENTS = 1 << 1;
const BOT_HEADERS = {
	Authorization: `Bot ${options.botToken}`,
	'Content-Type': 'application/json',
};

class DiscordError extends Error {
	constructor(message, code, errors) {
		super(message);
		this.code = code;
		this.errors = errors;
	}
}

function checkStatus(response) {
	return response.status >= 200 && response.status < 300;
}

async function createGuild() {
	const response = await fetch(`${API_BASE}/guilds`, {
		method: 'POST',
		body: JSON.stringify({
			name: options.guildName,
			target_type: 0,
			roles: [
				{
					id: 0,
				},
				{
					id: 0,
					name: options.adminRoleName,
					color: parseInt(options.adminRoleColor.replace('#', ''), 16),
					emoji: options.adminRoleEmoji,
					mentionable: options.adminRoleMentionable,
					hoist: options.adminRoleHoist,
					position: 0,
					permissions: 8,
				},
			],
		}),
		headers: BOT_HEADERS,
	});

	if (!checkStatus(response)) {
		const error = await response.json();
		throw new DiscordError(error.message);
	}

	const guild = await response.json();
	return guild;
}

async function getChannels(guild) {
	const response = await fetch(`${API_BASE}/guilds/${guild.id}/channels`, {
		method: 'GET',
		headers: BOT_HEADERS,
	});

	if (!checkStatus(response)) {
		const error = await response.json();
		throw new DiscordError(error.message);
	}

	const channels = await response.json();
	return channels;
}

async function createInvite(channel) {
	const response = await fetch(`${API_BASE}/channels/${channel.id}/invites`, {
		method: 'POST',
		body: JSON.stringify({
			max_uses: 1,
		}),
		headers: BOT_HEADERS,
	});

	if (!checkStatus(response)) {
		const error = await response.json();
		throw new DiscordError(error.message);
	}

	const invite = await response.json();
	return invite;
}

async function addMemberRole(guild, member, role) {
	const response = await fetch(
		`${API_BASE}/guilds/${guild}/members/${member}/roles/${role}`,
		{
			method: 'PUT',
			headers: BOT_HEADERS,
		}
	);

	if (!checkStatus(response)) {
		const error = await response.json();
		throw new DiscordError(error.message, error.code, error.errors);
	}

	return null;
}

async function getBotInfo() {
	const response = await fetch(`${API_BASE}/oauth2/applications/@me`, {
		method: 'GET',
		headers: BOT_HEADERS,
	});

	if (!checkStatus(response)) {
		const error = await response.json();
		throw new DiscordError(error.message);
	}

	const botInfo = await response.json();
	return botInfo;
}

(async () => {
	try {
		const guild = await createGuild(options);
		const channels = await getChannels(guild);
		const invite = await createInvite(
			channels.find((channel) => channel.type === 0)
		);

		console.log(
			`\u001b[32m✓\u001b[0m Invite created: https://discord.gg/${invite.code} - Now waiting for the owner to join...`
		);

		if (!options.ownerId) {
			const botInfo = await getBotInfo();
			options.ownerId = botInfo.owner.id;
		}

		const ws = new WebSocket(
			`wss://gateway.discord.gg/?v=${API_VERSION}&encoding=json`
		);

		ws.on('open', () => {
			const identifyPayload = {
				op: 2,
				d: {
					token: options.botToken,
					intents: REQUIRED_INTENTS,
					properties: {
						os: process.platform,
						browser: 'create-discord-guild',
						device: process.platform,
					},
				},
			};
			ws.send(JSON.stringify(identifyPayload));
		});

		ws.on('message', async (data) => {
			const payload = JSON.parse(data);

			switch (payload.op) {
				case 10:
					const heartbeatInterval = payload.d.heartbeat_interval;
					setInterval(() => {
						const heartbeatPayload = {
							op: 1,
							d: null,
						};
						ws.send(JSON.stringify(heartbeatPayload));
					}, heartbeatInterval);
					break;
				case 0:
					const guildID = payload.d.guild_id;
					const memberID = payload.d.user.id;
					if (payload.t === 'GUILD_MEMBER_ADD') {
						if (guildID === guild.id && memberID === options.ownerId) {
							await addMemberRole(guild.id, memberID, guild.roles[1].id);
							ws.close();
							console.log(`\u001b[32m✓\u001b[0m Owner was granted admin role`);
							process.exit(0);
						}
					}
					break;
				default:
					break;
			}
		});
	} catch (error) {
		console.error(
			`\u001b[31m✕\u001b[0m ${error.message}${
				error.code
					? ` (${error.code})\n${JSON.stringify(error.errors, null, '\t')}`
					: ''
			}}`
		);
		return;
	}
})();
