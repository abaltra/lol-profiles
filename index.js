const Discord = require('discord.io')
const logger = require('winston')
const redis = require('redis')
const bluebird = require('bluebird')
bluebird.promisifyAll(redis.RedisClient.prototype);

const axios = require('axios')
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
  colorize: true
});
logger.level = 'debug';

const argv = require('minimist')(process.argv.slice(2))
const VALID_REGIONS = {
  'las': 'la2',
  'lan': 'la1',
  'ru': 'ru',
  'kr': 'kr',
  'br': 'br1',
  'oce': 'oc1',
  'jp': 'jp1',
  'na': 'na1',
  'eune': 'eun1',
  'euw': 'euw1',
  'tr': 'tr1'
}

let SUMMONER_URL = 'https://${region}.api.riotgames.com/lol/summoner/v3/summoners/by-name/${summonername}?api_key=${riotkey}'
let LEAGUE_URL = 'https://${region}.api.riotgames.com/lol/league/v3/leagues/by-summoner/${summonerid}?api_key=${riotkey}';

function buildUrl(url, obj) {
  //replace the keys inside url based on the obj keys
  Object.keys(obj).forEach(key => {
    url = url.replace(key, obj[key]);
  });

  return url;
}

function cleanSummonerName(name) {
  //keep names standard
  return name.toLowerCase().replace(' ', '');
}

function getLeagueData(data, summonerId) {
  let ret = {};
  data.forEach(league => {
    if (league.queue === 'RANKED_SOLO_5x5') {
      //we only care about solo/duo q
      ret.tier = league.tier;
      ret.name = league.name;
      league.entries.forEach(entry => {
        if (entry.playerOrTeamId == summonerId) {
          //we found our guy
          ret.rank = entry.rank;
          ret.leaguePoints = entry.leaguePoints;
          ret.winrate = (entry.wins * 100.0) / (entry.wins + entry.losses) ;
          ret.miniSeries = entry.miniSeries;
        }
      });
    }
  });

  return ret;
}

function handleErrors(bot, channelId, code) {
  if (code === 404) {
    bot.sendMessage({
      channelId: channelId,
      message: 'Summoner not found.'
    });
  } else if (code === 429) {
    bot.sendMessage({
      channelId: channelId,
      message: 'Getting throttled by Riot. Wait a few and try again.'
    });
  } else {
    bot.sendMessage({
      channelId: channelId,
      message: 'Something went wrong. Try again'
    })
  }
}

async function run() {
  let discordToken = argv.discordToken;
  let riotKey = argv.riotKey;

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

  bot.on('message', async (user, userId, channelId, message, evt) => {
    if (message && message[0] == '!') {
      //If it's a command
      let args = message.slice(1).split(' ');
      let command = args[0];

      if (command === 'lolprofile') {
        //Check for the proper command
        let profile = args[1];
        if (!profile) {
          //sanitize input
          bot.sendMessage({
            to: channelId,
            message: 'You are missing the player profile there...'
          });
          return;
        }

        let [summonername, region] = profile.split(':');
        if (!summonername || !region) {
          //keep sanitizing
          bot.sendMessage({
            to: channelId,
            message: 'You are missing some info. The format is ${SUMMONER_NAME}:${REGION}'
          });
          return;
        }

        if (!region || !VALID_REGIONS[region]) {
          //final validation
          bot.sendMessage({
            to: channelId,
            message: `${region} is not a valid Region. Valid regions are: ${Object.keys(VALID_REGIONS).join(',')}`
          });
          return;
        }

        let url = buildUrl(SUMMONER_URL, { '${region}': VALID_REGIONS[region], '${summonername}': cleanSummonerName(summonername), '${riotkey}': riotKey });

        try {
            let response = await axios.get(url);
            if (response.status === 200) {
              //get the player profile first
              let leagueUrl = buildUrl(LEAGUE_URL, { '${region}': VALID_REGIONS[region], '${summonerid}': response.data.id, '${riotkey}': riotKey });
              let leagueResponse = await axios.get(leagueUrl);

              if (leagueResponse.status === 200) {
                let league = getLeagueData(leagueResponse.data, response.data.id);
                let message = `${response.data.name} is a level ${response.data.summonerLevel} summoner. Currently in ${league.name} (${league.tier} ${league.rank}) with a win rate of ${league.winrate.toFixed(2)}%`;
                if (league.miniSeries) {
                  message += `. He's currently in promo!, ${league.miniSeries.wins}-${league.miniSeries.losses} out of ${league.miniSeries.target} games.`;
                }
                bot.sendMessage({
                  to: channelId,
                  message: message
                });
              } else {
                handleErrors(bot, channelId, leagueResponse.status);
                return;
              }

            } else {
              handleErrors(bot, channelId, response.status);
            }

            return;
        } catch (e) {
          console.log(e)
        }

      }
    }
  });

  bot.on('disconnect', (msg, code) => {
    logger.error(`App disconnected: ${msg}, ${code}`);
    process.exit(-2);
  });
}

run();
