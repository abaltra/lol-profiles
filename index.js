const Discord = require('discord.io')
const logger = require('winston')
const axios = require('axios')
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
  colorize: true
});
logger.level = 'debug';

const argv = require('minimist')(process.argv.slice(2))

async function run() {
  let discordToken = argv.discordToken;
  let riotKey = argv.riotKey;

  console.log(argv)

  if (!discordToken || !riotKey) {
    logger.error(`Riot Key and Discord Key are both required`);
    process.exit(-1);
  }

  const bot = new Discord.Client({
    token: discordToken,
    autorun: true
  });

  bot.on('ready', evt => {
    logger.info(`Bot connected as ${bot.username} (${bot.id})`);
  });

  bot.on('message', (user, userId, channelId, message, evt) => {
    if (message && message[0] == '!') {
      //If it's a command
      let args = message.slice(1).split(' ');
      let command = args[0];

      if (command === 'lolprofile') {
        bot.sendMessage({
          to: channelId,
          message: 'we are waaarking!'
        });
      }
    }
  });

  bot.on('disconnect', (msg, code) => {
    logger.error(`App disconnected: ${msg}, ${code}`);
    process.exit(-2);
  });
}

run();
