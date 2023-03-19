# create-discord-guild
> **CLI app to create a Discord guild using a bot account and giving yourself admin**

## How it works
The Discord API makes for a bot user to [create a guild](https://discord.com/developers/docs/resources/guild#create-guild) (server) if it is in less than 10 guilds. To run the CLI app, run `npx create-discord guild --bot-token <token>`. A new guild will be created and you will be able to join using the invite posted in the console. The bot then waits for you to join, and then grants you an admin role that you can customize with the options. 

## Caveats
- The bot must be in less than 10 guilds. 
- The bot must have the [server members intent](https://discord.com/developers/docs/topics/gateway#privileged-intents) enabled because this event is used to tell when the user joined. This can be enabled by "[toggling] the privileged intents on the Bots page under the "Privileged Gateway Intents" section" and disabled right after usage.  

## Options
```sh
Usage: create-discord-guild [options]

Options:
  -V, --version                        output the version number
  -t, --bot-token <token>              Set the Discord bot token. If not specified, use bot owner
  -i, --owner-id <id>                  Set the owner ID
  -n, --guild-name <name>              Set the guild name
  -c, --admin-role-color <color>       Set the admin role color
  -r, --admin-role-name <name>         Set the admin role name
  -h, --admin-role-hoist <bool>        Whether to hoist the admin role or not
  -m, --admin-role-mentionable <bool>
  -e --admin-role-emoji <emoji>        Admin role emoji (unicode)
  --help                               display help for command
  ```

