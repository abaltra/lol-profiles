# lol-profiles
Discord bot that display's League of Legends players' profiles

## Requirements
```
Node >= 8
Redis
```

## Instructions
First and foremost, get a bot token from Discord. Follow the instructions [here](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token) to accomplish that.
You'll also need a Riot developer key, you can get one from [here](https://developer.riotgames.com)

After getting both keys, just run this to start the bot:
```
npm i
node index.js --discordToken=YOUR_DISCORD_TOKEN --riotKey=YOUR_RIOT_KEY
```