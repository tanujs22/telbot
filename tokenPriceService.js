/* eslint-disable no-param-reassign */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-redeclare */
/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable block-scoped-var */
/* eslint-disable max-len */
const config = require("./config.js");
const util = require('util');
const Web3 = require('web3');
const request = util.promisify(require('request'));

const getTokenStatisticsLogger = require('debug')('get-statistics');

const fiveMinutesBlock = 100;
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,

  // These options are needed to round to whole numbers if that's what you want.
  // minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  // maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

const deadWallet = '0x000000000000000000000000000000000000dEaD';

const DecimalsAndSupplyABI = [
  // decimals
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCirculatingSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    type: 'function',
  },
];

function getTokenPriceAtBlockMoralis(tokenAddress, blockNumber, chain) {
  if (chain == 'bsc') {
    var options = {
      method: 'GET',
      url: `https://deep-index.moralis.io/api/v2/erc20/${tokenAddress}/price?chain=bsc&to_block=${blockNumber}`,
      headers: {
        'x-api-key':
          `${config.moralisApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ genre: 'History times' }),
    };
  } else {
    var options = {
      method: 'GET',
      url: `https://deep-index.moralis.io/api/v2/erc20/${tokenAddress}/price?chain=eth&to_block=${blockNumber}`,
      headers: {
        'x-api-key':
               `${config.moralisApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ genre: 'History times' }),
    };
  }

  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        reject(error);
      }
      const jsonResult = JSON.parse(body);
      let tokenPrice = parseFloat(jsonResult.usdPrice);
      if (isNaN(tokenPrice)) {
        tokenPrice = 0;
      }
      resolve(tokenPrice);
    });
  });
}

async function getBnbPriceInDollars(block) {
  return getTokenPriceAtBlockMoralis(
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    block,
    'bsc'
  );
}

async function getEthPriceInDollars(block) {
  return getTokenPriceAtBlockMoralis(
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    block,
    'eth'
  );
}

async function getTokenMetaData(tokenAddress) {
  return new Promise((resolve, reject) => {
    var options = {
      method: 'GET',
      url: `https://deep-index.moralis.io/api/v2/erc20/metadata?chain=bsc&addresses=${tokenAddress}`,
      headers: {
        'x-api-key':
               `${config.moralisApiKey}`,
      },
    };
    request(options, (error, response) => {
      if (error) reject('Error getting token meta data....', error);
      const jsonData = JSON.parse(response.body)[0];
      resolve({
        symbol: jsonData.symbol,
        name: jsonData.name,
        decimals: jsonData.decimals,
      });
    });
  });
}

async function getCurrentPrice(tokenAddress, chain) {
  return new Promise((resolve, reject) => {
    if (chain == 'bsc') {
      var options = {
        method: 'GET',
        url: `https://deep-index.moralis.io/api/v2/erc20/${tokenAddress}/price?chain=bsc`,
        headers: {
          'x-api-key':
                 `${config.moralisApiKey}`,
        },
      };
    } else {
      var options = {
        method: 'GET',
        url: `https://deep-index.moralis.io/api/v2/erc20/${tokenAddress}/price?chain=eth`,
        headers: {
          'x-api-key':
                 `${config.moralisApiKey}`,
        },
      };
    }

    request(options, (error, response) => {
      if (error) reject('Error getting token meta data....', error);
      const currentPrice = JSON.parse(response.body).usdPrice;
      resolve(currentPrice);
    });
  });
}

async function getPriceAtBlock(tokenAddress, block, chain) {
  return new Promise((resolve, reject) => {
    if (chain == 'bsc') {
      var options = {
        method: 'GET',
        url: `https://deep-index.moralis.io/api/v2/erc20/${tokenAddress}/price?chain=bsc&to_block=${block}`,
        headers: {
          'x-api-key':
                 `${config.moralisApiKey}`,
        },
      };
    } else {
      var options = {
        method: 'GET',
        url: `https://deep-index.moralis.io/api/v2/erc20/${tokenAddress}/price?chain=eth&to_block=${block}`,
        headers: {
          'x-api-key':
                 `${config.moralisApiKey}`,
        },
      };
    }

    request(options, (error, response) => {
      if (error) reject('Error getting token meta data....', error);
      const currentPrice = JSON.parse(response.body).usdPrice;
      resolve(currentPrice);
    });
  });
}
async function getCurrentMarketcap(tokenAddress, chain) {
  if (chain == 'bsc') {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org/')
    );
  } else {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://eth-mainnet.public.blastapi.io')
    );
  }
  tokenAddress = web3.utils.toChecksumAddress(tokenAddress);
  const tokenContractInstance = new web3.eth.Contract(
    DecimalsAndSupplyABI,
    tokenAddress
  );

  var decimals = await tokenContractInstance.methods.decimals().call();

  try {
    var supply = await tokenContractInstance.methods
      .getCirculatingSupply()
      .call();
    supply /= 10 ** decimals;
  } catch (err) {
    try {
      var supply = await tokenContractInstance.methods.totalSupply().call();
      supply /= 10 ** decimals;
      let deadWalletBalance = await tokenContractInstance.methods
        .balanceOf(deadWallet)
        .call();
      deadWalletBalance /= 10 ** decimals;
      supply -= deadWalletBalance;
    } catch (error) {
      console.log('Error getting supply for token: ', tokenAddress);
    }
  }

  const currentPrice = await getCurrentPrice(tokenAddress, chain);

  let currentMarketCap = currentPrice * supply;
  if (isNaN(currentMarketCap)) currentMarketCap = 0;
  return currentMarketCap;
}

async function getTokenMetaDataWeb3(tokenAddress, chain) {
  if (chain == 'bsc') {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org/')
    );
  } else {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://eth-mainnet.public.blastapi.io')
    );
  }

  tokenAddress = web3.utils.toChecksumAddress(tokenAddress);
  const contract = new web3.eth.Contract(DecimalsAndSupplyABI, tokenAddress);
  const symbol = await contract.methods.symbol().call();
  const name = await contract.methods.name().call();
  return { symbol, name };
}

async function getTokenStatistics(tokenAddress, chain) {
  const statisticData = { buys: 0, sells: 0 };

  if (chain === 'bsc') {
    var options = {
      method: 'POST',
      url: 'https://graphql.bitquery.io/',
      headers: {
        'x-api-key': `${config.bitqueryApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{
        ethereum(network: bsc) {
          dexTrades(baseCurrency: {is: "${tokenAddress}"}) {
            side
            volume: tradeAmount(in: USD)
            maxPrice: maximum(of: quote_price, get: quote_price)
            maxPriceBlock: maximum(of: quote_price, get: block)
            maxPriceTime: maximum(of: quote_price, get: time)
            tradeTotal: count
            quoteCurrency {
              name
              symbol
              address
            }
          }
        }
      }`,
        variables: {},
      }),
    };
  } else {
    var options = {
      method: 'POST',
      url: 'https://graphql.bitquery.io/',
      headers: {
        'x-api-key': `${config.bitqueryApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{
        ethereum(network: ethereum) {
          dexTrades(baseCurrency: {is: "${tokenAddress}"}) {
            side
            volume: tradeAmount(in: USD)
            maxPrice: maximum(of: quote_price, get: quote_price)
            maxPriceBlock: maximum(of: quote_price, get: block)
            maxPriceTime: maximum(of: quote_price, get: time)
            tradeTotal: count
            quoteCurrency {
              name
              symbol
              address
            }
          }
        }
      }`,
        variables: {},
      }),
    };
  }

  const response = await request(options);
  getTokenStatisticsLogger('Getting token stats for :', tokenAddress);
  const jsonResult = JSON.parse(response.body);
  if (Array.isArray(jsonResult.data.ethereum.dexTrades)) {
    if (jsonResult.data.ethereum.dexTrades.length === 0) {
      console.log('No data found for this token: ', tokenAddress);
      return null;
    }
  } else {
    console.log('No data found for this token: ', tokenAddress);
    return null;
  }

  const data = jsonResult.data.ethereum.dexTrades;

  let correctLpPoolSymbol = null;
  let tradeTotal = 0;

  // find the quote currency which had the most trades, meaning the correct one.
  data.forEach((item) => {
    if (item.side === 'BUY') {
      if (item.tradeTotal > tradeTotal) {
        correctLpPoolSymbol = item.quoteCurrency.symbol;
        tradeTotal = item.tradeTotal;
      }
    }
  });

  // if there are no buys just sells , find correct quote currency using sells..
  if (correctLpPoolSymbol == null) {
    data.forEach((item) => {
      if (item.side === 'SELL') {
        if (item.tradeTotal > tradeTotal) {
          correctLpPoolSymbol = item.quoteCurrency.symbol;
          tradeTotal = item.tradeTotal;
        }
      }
    });
  }

  // check the data again and fetch the information from the correct quote currency we found.
  // if the side is sell, that is actually the number of buys...
  // Because we are SELLING our quote currency which is WBNB, or BUSD etc and buuying token.
  data.forEach((item) => {
    if (item.quoteCurrency.symbol === correctLpPoolSymbol) {
      if (item.side === 'SELL') {
        statisticData.buys = item.tradeTotal;
      } else {
        statisticData.sells = item.tradeTotal;
      }

      statisticData.volume = item.volume;
      statisticData.maxPrice = item.maxPrice;
      statisticData.maxPriceBlock = item.maxPriceBlock;
      statisticData.maxPriceTime = item.maxPriceTime;
      statisticData.quoteCurrency = item.quoteCurrency;
    }
  });

  if (statisticData.quoteCurrency.symbol === 'WBNB') {
    statisticData.bnbPriceAtTime = await getBnbPriceInDollars(
      statisticData.maxPriceBlock
    );
    statisticData.maxPrice =
      statisticData.bnbPriceAtTime * parseFloat(statisticData.maxPrice);
  }

  if (statisticData.quoteCurrency.symbol === 'WETH') {
    statisticData.bnbPriceAtTime = await getEthPriceInDollars(
      statisticData.maxPriceBlock
    );
    statisticData.maxPrice =
      statisticData.bnbPriceAtTime * parseFloat(statisticData.maxPrice);
  }

  const tokenPrice = parseFloat(statisticData.maxPrice);

  if (chain === 'bsc') {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org/')
    );
  } else {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://eth-mainnet.public.blastapi.io')
    );
  }

  const tokenContractInstance = new web3.eth.Contract(
    DecimalsAndSupplyABI,
    tokenAddress
  );

  try {
    var supply = await tokenContractInstance.methods
      .getCirculatingSupply()
      .call();
  } catch (err) {
    try {
      var supply = await tokenContractInstance.methods.totalSupply().call();
    } catch (error) {
      console.log('Error getting supply for token: ', tokenAddress);
    }
  }
  try {
    var decimals = await tokenContractInstance.methods.decimals().call();
  } catch (err) {
    console.log(
      `Error getting decimals for ${tokenAddress} .... error message : ${err}`
    );
  }

  // use moralis to get decimals and other info like symbol and name.
  const { symbol, name } = await getTokenMetaDataWeb3(tokenAddress, chain);

  let mc = supply * tokenPrice * 10 ** -decimals;
  while (true) {
    if (mc > 10000000000) {
      mc /= 1000000000;
    } else {
      break;
    }
  }
  statisticData.symbol = symbol;
  statisticData.name = name;
  statisticData.tokenAddress = tokenAddress;
  statisticData.highestMarketcap = mc;
  return statisticData;
}

async function changes(tokenAddress, chain) {
  try {
    if (chain == 'bsc') {
      var web3 = new Web3(
        new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org/')
      );
    } else {
      var web3 = new Web3(
        new Web3.providers.HttpProvider(
          'https://eth-mainnet.public.blastapi.io'
        )
      );
    }
    const theCurrentPrice = await getCurrentPrice(tokenAddress, chain);

    const currentBlock = await web3.eth.getBlockNumber();

    const block15MinutesAgo = currentBlock - 3 * fiveMinutesBlock;
    const price15MinutesAgo = await getPriceAtBlock(
      tokenAddress,
      block15MinutesAgo,
      chain
    );

    if (price15MinutesAgo == 0) {
      return { changeSince15MinutesData: { change: 0 } };
    }

    const changeSince15Minutes =
      (theCurrentPrice - price15MinutesAgo) / price15MinutesAgo;
    const changeSince15MinutesData = {
      change: changeSince15Minutes * 100,
      isPositive: changeSince15Minutes > 0,
    };
    if (isNaN(changeSince15MinutesData.change)) {
      changeSince15MinutesData.change = 0;
    }

    return { changeSince15MinutesData };
  } catch (err) {
    return { changeSince15MinutesData: { change: 0 } };
  }

  // const sevenDayAgoBlock = currentBlock - 201600;
}

async function getChangeSince15MinutesString(tokenAddress, chain) {
  const { changeSince15MinutesData } = await changes(tokenAddress, chain);
  let changeSince15Minutes = 0;
  if (changeSince15MinutesData.isPositive) {
    changeSince15Minutes = `+${changeSince15MinutesData.change.toFixed(2)}% 🟢`;
  } else if (changeSince15MinutesData.change === 0) {
    changeSince15Minutes = `0`;
  } else {
    changeSince15Minutes = `${changeSince15MinutesData.change.toFixed(2)}% 🔴`;
  }

  return changeSince15Minutes;
}

module.exports = {
  getChangeSince15MinutesString,
  getBnbPriceInDollars,
  getTokenStatistics,
  getTokenMetaData,
  getCurrentMarketcap,
  getTokenMetaDataWeb3,
};
