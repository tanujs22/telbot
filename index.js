const config = require("./config.js");

const footer = config.footer;
const adText = config.adText;
const adUrl = config.adUrl;
const ownerText = config.ownerText;
const ownerUrl = config.ownerUrl;
const emptyChar = '‎';
const wEth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const ignoreOldMessages = require('telegraf-ignore-old-messages');
const utilities = require('./utilities');
const tokenPriceService = require('./tokenPriceService');
const cacheManager = require('./cacheManager');
const whitelistService = require('./whitelistService');
const { formatMessage, getChartScreenshot } = require('./message');

const scansGroupId = config.scansGroupId; //prod
// const scansGroupId = -1001925670984; //dev 

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,

  // These options are needed to round to whole numbers if that's what you want.
  // minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  // maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

const whitelistingEnabled = false;
let running = false;
const previousUser = { id: null };
var uniqueContractsScanned = [];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function setUserCoolDownData(coolDownInSeconds, ctx) {
  previousUser.id = ctx.message.from.id;
  previousUser.startCoolDownSeconds = Date.now() / 1000;
  previousUser.endCoolDownSeconds = Date.now() / 1000 + coolDownInSeconds;
}
// tech tiger for testing

const bot = new Telegraf(config.telegramBotToken);

bot.use(ignoreOldMessages(1));

// bot.telegram.sendMessage(-1001667493931, 'test from bot');

async function waitUntilFree() {
  if (running) {
    while (true) {
      await sleep(1000);
      if (!running) {
        return;
      }
    }
  }
}

function getTheContractFromMessage(message) {
  if (message.length === 1) {
    if (message[0].length === 42) {
      return message[0];
    }
    if (message[0].length === 69) {
      return message[0].substring(27);
    }

    return false;
  }
  if (message[1].length !== 42) {
    return false;
  }
  return message[1];
}

function isSpamming(ctx) {
  if (previousUser.id === ctx.message.from.id) {
    if (Date.now() / 1000 < previousUser.endCoolDownSeconds) {
      console.log(
        `${ctx.message.from.first_name} ${ctx.message.from.last_name} (${ctx.message.from.username}) tried to use the command too soon.`
      );
      return true;
    }

    previousUser.id = null;
  }
  return false;
}

function start() {
  bot.command('start', async (ctx) => {
    if (ctx.message.chat.type === 'private') {
      return ctx.reply(
        `Hey ${ctx.from.first_name} !\n\nI'm PastCoinBot, your friendly neighborhood crypto currency bot.\n\nI can help you check previous tokens launched by a developer.\n\nTo use this service, type /check followed by the token address.\n\nFor example, if you have a token called "0x0f8c...", you can type /check 0x0f8c... to check all past deployments of the developer of that token.`
      );
    }
  });



  bot.on('message', async (ctx) => {
    if (ctx.message.text) {
      const chatType = ctx.message.chat.type;
      if (chatType === 'private') {
        console.log(ctx.message)
        console.log(
          `${ctx.message.from.first_name} ${ctx.message.from.last_name} (${ctx.message.from.username}) said: ${ctx.message.text}`
          
        );
      }

      await waitUntilFree();

      const message = ctx.message.text.split(/\s+/);
      if (
        message[0] === '/ch' ||
        message[0] === '/check' ||
        message[0] === '/check@PastCoinBot' ||
        message[0].length === 42
      ) {
        let whitelisted = false;
        var IsUserInMyGroup = false;

        const checkIfUserIsInMyGroup = await bot.telegram.getChatMember(
          // -1001968057846,
          scansGroupId,
          ctx.message.from.id
        );

        if (checkIfUserIsInMyGroup.status === 'member') {
          IsUserInMyGroup = true;
        }

        if (chatType === 'private') {
          whitelisted = whitelistService.isUserWhitelisted(ctx.message.from.id);
          console.log(
            `USERID: ${ctx.message.from.id} USERNAME : (${ctx.message.from.username}) Fullname: ${ctx.message.from.first_name} ${ctx.message.from.last_name} said: ${ctx.message.text} , WHITELISTED: ${whitelisted} INMYGROUP: ${IsUserInMyGroup}`
          );
          if (!whitelisted && whitelistingEnabled) {
            return ctx.reply(
              'Please contact @cryptovyom to purchase this service.'
            );
          }
        } else {
          whitelisted = whitelistService.isGroupWhitelisted(
            ctx.message.chat.id
          );
          console.log(
            `GROUPID: ${ctx.message.chat.id} GROUPNAME : (${ctx.message.chat.title})  Username: ${ctx.message.from.username} Fullname: ${ctx.message.from.first_name} ${ctx.message.from.last_name} said: ${ctx.message.text} WHITELISTED: ${whitelisted}  INMYGROUP: ${IsUserInMyGroup}`
          );
          // dont want to spam if they just send CA, so nothing will be executed after due to the IF block.
          if (!whitelisted && message[0].length !== 42 && whitelistingEnabled) {
            return ctx.reply(
              'Please contact @cryptovyom to purchase this service.'
            );
          }
        }
        if (isSpamming(ctx)) {
          return ctx.reply(
            `Please wait ${parseInt(
              previousUser.endCoolDownSeconds - Date.now() / 1000,
              10
            )} seconds before sending another request.`
          );
        }

        // wont be executed if they arent WL and just send CA from group.. this is done to avoid spam
        if (true /* whitelisted && whitelistingEnabled */) {
          // change to true to ignore this check.
          var addressFromUser = getTheContractFromMessage(message);

          if (!addressFromUser) {
            return ctx.reply(
              'Please enter a valid token address, (a contract which implements the BEP-20 token interface)',
              { disable_web_page_preview: true }
            );
          }

          var chain = 'bsc';

          const isBscToken = await utilities.isErcToken(addressFromUser, chain);
          if (!isBscToken) chain = 'eth';
          const isThisATokenAndNotAWallet = await utilities.isErcToken(
            addressFromUser,
            chain
          );
          if (!isThisATokenAndNotAWallet) {
            console.log('User tried to send his wallet....');
            return ctx.replyWithHTML(
              'Please enter a valid token address, (a contract which implements the BEP-20 token interface)',
              { disable_web_page_preview: true }
            );
          }
          //
          setUserCoolDownData(5, ctx);

          await ctx.replyWithHTML('Checking...');

          cacheManager.removeCacheIfStale(addressFromUser);
          if (cacheManager.doesCachedResponseExist(addressFromUser)) {
            const { symbol, name } =
              await tokenPriceService.getTokenMetaDataWeb3(
                addressFromUser,
                chain
              );
            const currentMarketcap =
              await tokenPriceService.getCurrentMarketcap(
                addressFromUser,
                chain
              );

            const fifteenMinuteChange =
              await tokenPriceService.getChangeSince15MinutesString(
                addressFromUser,
                chain
              );

            // if we cant find the creation tx , access .from from null will throw an error.
            var ownersAddress =
              cacheManager.getCachedResponseForContract(
                addressFromUser
              ).developerWallet;
            if (chain === 'bsc') {
                console.log('reached 1')
               var tokenSentInfo = await formatMessage(name, symbol, addressFromUser, ownersAddress, formatter.format(currentMarketcap), fifteenMinuteChange, chain)
            //    const screenshot = await getChartScreenshot(chain, addressFromUser);

            } else {
              let ethPair = await utilities.getEthPairAddress(
                addressFromUser,
                wEth
              );

              if (ethPair === '0x0000000000000000000000000000000000000000') {
                ethPair = await utilities.getEthPairAddress(
                  addressFromUser,
                  USDC
                );
              }

              var tokenSentInfo = await formatMessage(name, symbol, addressFromUser, ownersAddress, formatter.format(currentMarketcap), fifteenMinuteChange, chain, ethPair)
              console.log('reached 2')
//                             `<i><b>${name} (${symbol})</b></i>

// 📃 <i>Contract</i>: <code>${addressFromUser}</code>
// <a href="https://etherscan.io/address/${ownersAddress}">Dev wallet</a>
// 💵 <b>Mcap</b>: ${formatter.format(currentMarketcap)}
// 💳<b>15 min price change</b>: ${fifteenMinuteChange}
// <b>Chain - ETH</b>
// 📈 <a href="https://www.dextools.io/app/ether/pair-explorer/${ethPair}">Chart</a>
// <pre>—————————————————————</pre>
                            
// `;
            }

            console.log(`Using cached response for ${addressFromUser}`);
            console.log(`Returning cached response for ${addressFromUser}`);
            // ctx.replyWithPhoto({ source: screenshot }, { caption: tokenSentInfo });

            return ctx.replyWithHTML(
                `${tokenSentInfo}${
                  cacheManager.getCachedResponseForContract(addressFromUser)
                    .response
                }\n${footer}`,
                {
                  disable_web_page_preview: true,
                  reply_to_message_id: ctx.message.message_id,
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: adText,
                          url: adUrl
                        }
                      ],
                      [
                        {
                          text: ownerText,
                          url: ownerUrl
                        }
                      ]
                    ]
                  }
                }
              );
          }

          console.log('Setting running status to true.... WAS: ', running);
          running = true;
          try {
            var isToken = await utilities.isErcToken(addressFromUser, chain);
          } catch (err) {
            console.log(
              `Error occured while trying to check if ${addressFromUser} is a token: ${err}`
            );
            running = false;
            console.log('Setting running status to FALSE... WAS: ', running);

            cacheManager.cacheIfRequired(
              addressFromUser,
              'Please enter a valid token address, (a contract which implements the BEP-20 token interface)'
            );
            return ctx.replyWithHTML(
              'Please enter a valid token address, (a contract which implements the BEP-20 token interface)',
              { disable_web_page_preview: true }
            );
          }

          console.log(isToken);
          if (isToken) {
            const { symbol, name } =
              await tokenPriceService.getTokenMetaDataWeb3(
                addressFromUser,
                chain
              );

            const fifteenMinuteChange =
              await tokenPriceService.getChangeSince15MinutesString(
                addressFromUser,
                chain
              );
            const currentMarketcap =
              await tokenPriceService.getCurrentMarketcap(
                addressFromUser,
                chain
              );

            try {
              var currentTime = Date.now() / 1000;
              //  const contractCreationTransactions = await utilities.returnContractCreationTransactions(addressFromUser);
              const creationTransaction =
                await utilities.returnContractCreationTransactionToFindOwner(
                  addressFromUser,
                  chain
                );
              console.log(
                `Time taken looping through tx of token to find owner: ${
                  Date.now() / 1000 - currentTime
                } seconds`
              );
              // if we cant find the creation tx , access .from from null will throw an error.
              var ownersAddress = creationTransaction.from;
              if (chain === 'bsc') {
                console.log('reached')
                var tokenSentInfo = await formatMessage(name, symbol, addressFromUser, ownersAddress, formatter.format(currentMarketcap), fifteenMinuteChange, chain)
                console.log('reached 3')
                //                 `<i><b>${name} (${symbol})</b></i>

// 📃<b><i>Contract</i></b>: <code>${addressFromUser}</code>
// 🥷<a href="https://bscscan.com/address/${ownersAddress}">Dev wallet</a>
// 💵<b>Mcap</b>: ${formatter.format(currentMarketcap)}
// 💳<b>15 min price change</b>: ${fifteenMinuteChange}
// <b>Chain - BSC</b>
// 📈<a href="https://poocoin.app/tokens/${addressFromUser}">Chart</a>
// <pre>—————————————————————</pre>
                 
// `;
              } else {
                var ethPair = await utilities.getEthPairAddress(
                  addressFromUser,
                  wEth
                );
                var tokenSentInfo = await formatMessage(name, symbol, addressFromUser, ownersAddress, formatter.format(currentMarketcap), fifteenMinuteChange, chain, ethPair)
                console.log('reached 4')
                //                 `<i><b>${name} (${symbol})</b></i>

// 📃<i>Contract</i>: <code>${addressFromUser}</code>
// 🥷<a href="https://etherscan.io/address/${ownersAddress}">Dev wallet</a>
// 💵<b>Mcap</b>: ${formatter.format(currentMarketcap)}
// 💳<b>15 min price change</b>: ${fifteenMinuteChange}
// <b>Chain - ETH</b>
// <a href="https://www.dextools.io/app/ether/pair-explorer/${ethPair}">📈Chart</a>
// <pre>—————————————————————</pre>
                              
// `;
              }
            } catch (err) {
              console.log('Setting running status to FALSE... WAS: ', running);
              running = false;
              setUserCoolDownData(5, ctx);
              cacheManager.cacheIfRequired(
                addressFromUser,
                'Contract was made indirectly through a deployer contract. \nContract creation event cannot be fetched. ',
                ownersAddress
              );
              return ctx.replyWithHTML(
                `Contract was made indirectly through a deployer contract. \nContract creation event cannot be fetched. \n${footer} `,
                {
                  disable_web_page_preview: true,
                }
              );
            }

            console.log(`Owners address is: ${ownersAddress}`);

            var currentTime = Date.now() / 1000;

            // if tokens never launched and have no data, returns an empty array.
            // so if an invalid address is supplied (no data) then nothing will be returned....
            // if we have valid data on the contract then a stat will be returned
            // so when we loop through this getting the best stat we dont need to worry about null values.
            try {
              var stats = await utilities.getTokenStatisticsForAllDeployments(
                ownersAddress,
                addressFromUser,
                ctx,
                chain
              );
            } catch (err) {
              console.log(
                `Error occured while trying to get token statistics for ${addressFromUser}: ${err}`
              );
            }

            console.log(
              `Time taken to get stats: ${
                Date.now() / 1000 - currentTime
              } seconds`
            );
            if (stats === false) {
              running = false;
              console.log('Setting running status to FALSE... WAS: ', running);
              setUserCoolDownData(5, ctx);
              cacheManager.cacheIfRequired(
                addressFromUser,
                'No previous deployments found. ',
                ownersAddress
              );
              if (
                !uniqueContractsScanned.includes(addressFromUser.toLowerCase())
              ) {
                bot.telegram.sendMessage(
                  scansGroupId,
                  `${chatType !== 'private'
                    ? `<pre>Group: ${ctx.message.chat.title}</pre>
                `
                    : ''
                  }${tokenSentInfo}No previous deployments found. \n${footer}`,
                  {
                    parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: {
                      inline_keyboard: [
                        [
                          {
                            text: adText,
                            url: adUrl
                          }
                        ],
                        [
                          {
                            text: ownerText,
                            url: ownerUrl
                          }
                        ]
                      ]
                    }
                  }
                );
                uniqueContractsScanned.push(addressFromUser.toLowerCase());
              }
              return ctx.replyWithHTML(
                `${tokenSentInfo}No previous deployments found. \n${footer}`,
                {
                  disable_web_page_preview: true,
                  reply_to_message_id: ctx.message.message_id,
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: adText,
                          url: adUrl
                        }
                      ],
                      [
                        {
                          text: ownerText,
                          url: ownerUrl
                        }
                      ]
                    ]
                  }
                }
              );
            }

            var numberOfContractsMade = stats.length;
            if (numberOfContractsMade === 1) {
              numberOfContractsMade = 1;
            } else {
              numberOfContractsMade -= 1;
            }

            // if the stats array is empty it returns null.. so we need to check for that.
            const bestStat = utilities.getBestStatisticFromArrayOfStatistics(
              stats,
              addressFromUser
            );

            if (chain === 'bsc') {
              var chart = `https://poocoin.app/tokens/${bestStat.tokenAddress}`;
            } else {
              let pairAddy = await utilities.getEthPairAddress(
                addressFromUser,
                wEth
              );

              if (pairAddy === '0x0000000000000000000000000000000000000000') {
                pairAddy = await utilities.getEthPairAddress(
                  addressFromUser,
                  USDC
                );
              }

              if (pairAddy === '0x0000000000000000000000000000000000000000') {
                var chart = 'Chart unavailable';
              } else {
                var chart = `https://www.dextools.io/app/ether/pair-explorer/${pairAddy}`;
              }
            }
            const bestStatString = `<b>${bestStat.name} (${bestStat.symbol})\n
📃Contract:</b> <code>${bestStat.tokenAddress}</code>\n💶<b>Highest Mcap:</b> <code>${bestStat.highestMarketcap}</code>\n💸<b>Total Volume</b>: <code>${bestStat.volume}</code>\n<b>Buys:</b> ${bestStat.buys} <b>Sells:</b> ${bestStat.sells}\n<a href="${chart}">📈Chart</a>\n\n`;
            let volB4 = bestStat.volume.substr(
              bestStat.volume.length - (bestStat.volume.length - 1)
            );
            console.log(volB4, typeof volB4)
            volB4 = volB4.replace(',', '');
            const bullish = Number(volB4) > 50000 ? true : false;
            var response = `👨‍🔬<b><i> Devs best previous project (out of ${numberOfContractsMade}) </i></b>:\n\n`;
            if (bullish) {
              response = `🟢 👨‍🔬<b><i> Devs best previous project (out of ${numberOfContractsMade}) </i></b> 🟢:\n\n`;
            }

            response += bestStatString;
            running = false;
            console.log('Setting running status to FALSE... WAS: ', running);
            setUserCoolDownData(5, ctx);
            cacheManager.cacheIfRequired(
              addressFromUser,
              response,
              ownersAddress
            );
            if (
              !uniqueContractsScanned.includes(
                bestStat.tokenAddress.toLowerCase()
              )
            ) {
              bot.telegram.sendMessage(
                scansGroupId,
                `${chatType !== 'private'
                  ? `<pre>Group: ${ctx.message.chat.title}</pre>
              `
                  : ''
                }${tokenSentInfo}${response}${footer}`,
                {
                  parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: adText,
                          url: adUrl
                        }
                      ],
                      [
                        {
                          text: ownerText,
                          url: ownerUrl
                        }
                      ]
                    ]
                  }
                }
              );
              uniqueContractsScanned.push(bestStat.tokenAddress.toLowerCase());
            }

            return ctx.replyWithHTML(tokenSentInfo + response + footer,             {
              disable_web_page_preview: true,
              reply_to_message_id: ctx.message.message_id,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: adText,
                      url: adUrl
                    }
                  ],
                  [
                    {
                      text: ownerText,
                      url: ownerUrl
                    }
                  ]
                ]
              }
            });

          }
          // supplied address isnt a token, we couldnt get decimals for it.
          running = false;
          console.log('Setting running status to FALSE... WAS: ', running);
          cacheManager.cacheIfRequired(
            addressFromUser,
            'Please enter a valid token address, (a contract which implements the BEP-20 token interface)'
          );
          return ctx.replyWithHTML(
            `Please enter a valid  token address, (an contract which implements the ERC-20 token interface) \n${footer}`,
            { reply_to_message_id: ctx.message.message_id }
          );
        }
      }

      if (ctx.message.chat.type === 'private') {
        return ctx.replyWithMarkdownV2(
          "I didn't quite get you\\! \\. Please use /check  \\<token address\\> "
        );
      }
    }
  });

  bot.catch((err) => {
    console.log(`Error! Restarting.... ${err}`);
    bot.stop();
    start();
  });

  bot.launch();
}

start();
