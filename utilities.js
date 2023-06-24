const config = require('./config.js');
const Web3 = require('web3');
const request = require('request');
const util = require('util');
const getContractsMadeByDeployerLogger = require('debug')('contracts-made');
const getAllTokenStatisticsLogger = require('debug')('all-statistics');
const caCreationLogger = require('debug')('contract-creation');
const isTokenLogger = require('debug')('is-token');

const tokenPriceService = require('./tokenPriceService');

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
];
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,

  // These options are needed to round to whole numbers if that's what you want.
  // minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  // maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});


async function returnContractCreationTransactions(contract, chain) {
  if (chain === 'bsc') {
    var options = {
      method: 'GET',
      url: `https://api.bscscan.com/api?module=account&action=txlist&address=${contract}&startblock=0&endblock=99999999&apikey=${config.bscscanApiKey}`,
      headers: {},
    };
  } else {
    var options = {
      method: 'GET',
      url: `https://api.etherscan.io/api?module=account&action=txlist&address=${contract}&startblock=0&endblock=99999999&apikey=${config.etherscanApiKey}`,
      headers: {},
    };
  }
  return new Promise((resolve, reject) => {
    const contractCreationsTransactions = [];

    request(options, (error, response) => {
      if (error) {
        reject(error);
      }
      const data = JSON.parse(response.body);

      const transactions = data.result;
      if (data.status === 0) {
        reject('invalid address');
      } else {
        try {
          transactions.forEach((tx) => {
            if (tx.to === '') {
              const creationObject = {};
              creationObject.hash = tx.hash;
              creationObject.from = tx.from;
              creationObject.contractMade = tx.contractAddress;
              contractCreationsTransactions.push(creationObject);
            }
          });
          if (contractCreationsTransactions.length === 0) {
            reject('No contract creation transactions found');
          }
          resolve(contractCreationsTransactions);
        } catch (err) {
          reject(err);
        }
      }
    });
  });
}

async function returnContractCreationTransactionToFindOwner(contract, chain) {
  const myRequest = util.promisify(request);

  if (chain === 'bsc') {
    var options = {
      method: 'GET',
      url: `https://api.bscscan.com/api?module=account&action=txlist&address=${contract}&startblock=0&endblock=99999999&apikey=${config.bscscanApiKey}`,
      headers: {},
    };
  } else {
    var options = {
      method: 'GET',
      url: `https://api.etherscan.io/api?module=account&action=txlist&address=${contract}&startblock=0&endblock=99999999&apikey=${config.etherscanApiKey}`,
      headers: {},
    };
  }
  // MORALIS API

  const result = await myRequest(options);
  const data = JSON.parse(result.body);
  const transactions = data.result;
  if (data.status === 0) {
    console.log(
      'No results from bscscan api call to get all transactions from contract '
    );
    return null;
  }
  let tx = transactions[0];
  if (tx.to === '') {
    const creationObject = {};
    creationObject.hash = tx.hash;
    creationObject.from = tx.from;
    creationObject.contractMade = tx.contractAddress;
    contractCreationsTransaction = creationObject;

    return contractCreationsTransaction;
  }
  console.log("Couldn't find a contract creation!");
  return null;
}



async function getContractFromContractCreationTransactionWeb3(txHash, chain) {
  if (chain == 'bsc') {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org/')
    );
  } else {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://eth-mainnet.public.blastapi.io')
    );
  }
  let txReceipt = await web3.eth.getTransactionReceipt(txHash);
  try {
    if (txReceipt == null) {
      getContractsMadeByDeployerLogger(
        'Contract was null from address....waiting....'
      );
      await sleep(8000);
    }
    txReceipt = await web3.eth.getTransactionReceipt(txHash);
    const contractCreated = txReceipt.contractAddress;
    return contractCreated;
  } catch (err) {
    return null;
  }
}

async function getNumberOfContractsMadeByDeployer(deployerAddress) {
  try {
    const contractCreationTransactions =
      await returnContractCreationTransactions(deployerAddress);
    return contractCreationTransactions.length;
  } catch (err) {
    return 0;
  }
}

async function getContractsMadeByDeployer(deployerAddress, chain) {
  const contractCreationTransactions = await returnContractCreationTransactions(
    deployerAddress,
    chain
  );

  const contractsThatWereMade = [];

  for (const creationObject of contractCreationTransactions) {
    try {
      // const contractAddress = await getContractFromContractCreationTransaction(creationObject.hash);
      contractsThatWereMade.push(creationObject.contractMade);
    } catch (err) {
      getContractsMadeByDeployerLogger(
        `Transaction: ${txHash} did not create a contract?, (logs field was empty and didn't contain a contract address)`
      );
    }
  }

  return contractsThatWereMade;
}

async function isErcToken(tokenAddress, chain) {
  if (chain === 'bsc') {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org/')
    );
  } else {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://eth-mainnet.public.blastapi.io')
    );
  }
  tokenAddress = web3.utils.toChecksumAddress(tokenAddress);
  try {
    var tokenContractInstance = new web3.eth.Contract(
      DecimalsAndSupplyABI,
      tokenAddress
    );
  } catch (err) {
    console.log(
      'User probably supplied wallet addy, so couldnt check if ERC token when creating contract instance',
      err
    );
    return false;
  }

  try {
    var decimals = await tokenContractInstance.methods.decimals().call();
    return true;
  } catch (err) {
    isTokenLogger(`Error, token ${tokenAddress} is not an erc token`);
    return false;
  }
}

async function getTokenStatisticsForAllDeployments(
  deployerAddress,
  addressFromUser,
  ctx,
  chain
) {
  if (chain == 'bsc') {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://bsc-dataseed1.binance.org/')
    );
  } else {
    var web3 = new Web3(
      new Web3.providers.HttpProvider('https://eth-mainnet.public.blastapi.io')
    );
  }

  const ownerAddress = web3.utils.toChecksumAddress(deployerAddress);

  const statsForAllDeployments = [];
  try {
    const contracts = await getContractsMadeByDeployer(ownerAddress, chain);

    // some contracts may have no statistics.
    if (contracts.length === 0) {
      getAllTokenStatisticsLogger(
        `No contracts were deployed by ${ownerAddress}`
      );
      return false;
    }

    if (contracts.length === 1) {
      return false;
    }

    // since we have more than 1 stat atleast, making sure we dont return stats for the token sent by the user.
    // this way, we dont need to worry about it while getting the best stat.

    if (contracts.length > 20) {
      ctx.reply(
        `The developer has deployed too many contracts! (${contracts.length})\n Checking past 20 instead.`
      );
      for (let i = 0; i < 20; i++) {
        if (contracts[i].toLowerCase() !== addressFromUser.toLowerCase()) {
          const stats = await tokenPriceService.getTokenStatistics(
            contracts[i],
            chain
          );
          if (!(stats === null)) {
            statsForAllDeployments.push(stats);
          }
        }
      }
    } else {
      for (const contract of contracts) {
        if (contract.toLowerCase() !== addressFromUser.toLowerCase()) {
          const stats = await tokenPriceService.getTokenStatistics(
            contract,
            chain
          );
          if (!(stats === null)) {
            statsForAllDeployments.push(stats);
          }
        }
      }
    }

    // ensures while getting the best stat, we will have atleast one stat to work with.
    if (statsForAllDeployments.length === 0) {
      getAllTokenStatisticsLogger(
        'All deployments by this deployer address had no token statistics'
      );

      return false;
    }

    // if only valid deployment was the one we scanned, then the bestStat logic will return an empty stat object
    // if we access values from this empty stat object an error will occur, so we act early and return false.
    if (statsForAllDeployments.length === 1) {
      if (
        statsForAllDeployments[0].tokenAddress.toLowerCase() ===
        addressFromUser.toLowerCase()
      ) {
        return false;
      }
    }
  } catch (err) {
    getAllTokenStatisticsLogger(err);
  }

  return statsForAllDeployments;
}

async function didTheTxCreateAToken(transactionObject, chain) {
  const ca = await getContractFromContractCreationTransactionWeb3(
    transactionObject.hash,
    chain
  );
  const isToken = await isErcToken(ca);
  if (isToken) {
    caCreationLogger(`${transactionObject.from} created ${ca}`);
  } else {
    caCreationLogger(`${ca} IS NOT A TOKEN!`);
  }
  return isToken;
}

function isThisBestStatRealistic(bestStatistic) {
  if (bestStatistic.highestMarketcap > 50000) {
    if (bestStatistic.volume > 0.01 * bestStatistic.highestMarketcap) {
      return true;
    }
  }

  return false;
}

function getBestStatisticFromArrayOfStatistics(statistics, addressFromUser) {
  let bestStat = { highestMarketcap: 0 };
  for (var statistic of statistics) {
    if (statistic.highestMarketcap > bestStat.highestMarketcap) {
      bestStat = statistic;
      bestStat.highestMarketcap = formatter.format(bestStat.highestMarketcap);
      bestStat.volume = formatter.format(bestStat.volume);
    }
  }

  return bestStat;
}

async function getBestStatisticFromTransactionObject(transactionObject) {
  const didTransactionObjectCreateToken = await didTheTxCreateAToken(
    transactionObject
  );
  if (didTransactionObjectCreateToken) {
    const stasticsForDeployments = await getTokenStatisticsForAllDeployments(
      transactionObject.from
    );

    let bestStatistic = getBestStatisticFromArrayOfStatistics(
      stasticsForDeployments
    );
    const realisticVolume = isThisBestStatRealistic(bestStatistic);
    bestStatistic.realisticVolume = realisticVolume;
    return bestStatistic;
  }
  return null;
}

function stringSanitizer(text) {
  return text
    .replace(/\_/g, '\\_\\')
    .replace(/\*/g, '\\*\\')
    .replace(/\[/g, '\\[\\')
    .replace(/\]/g, '\\]\\')
    .replace(/\(/g, '\\(\\')
    .replace(/\)/g, '\\)')
    .replace(/\~/g, '\\~\\')
    .replace(/\`/g, '\\`\\')
    .replace(/\>/g, '\\>\\')
    .replace(/\#/g, '\\#\\')
    .replace(/\+/g, '\\+\\')
    .replace(/\-/g, '\\-\\')
    .replace(/\=/g, '\\+\\')
    .replace(/\|/g, '\\|\\')
    .replace(/\{/g, '\\{\\')
    .replace(/\}/g, '\\}\\')
    .replace(/\!/g, '\\!')
    .replace(/\./g, '\\.');
}

const getPairAbi = [
  {
    constant: true,
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'getPair',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    type: 'function',
  },
];

const ethFactory = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';

async function getEthPairAddress(tokenA, tokenB) {
  var web3 = new Web3(
    new Web3.providers.HttpProvider('https://eth-mainnet.public.blastapi.io')
  );

  const tokenContractInstance = new web3.eth.Contract(getPairAbi, ethFactory);

  const pair = await tokenContractInstance.methods
    .getPair(tokenA, tokenB)
    .call();
  return pair;
}

async function isWallet(address) {
  var web3 = new Web3(
    new Web3.providers.HttpProvider('https://eth-mainnet.public.blastapi.io')
  );
  const tokenAddress = web3.utils.toChecksumAddress(address);
  try {
    var code = await web3.eth.getCode(tokenAddress);
  } catch (err) {
    return false;
  }

  if (code.length > 2) return true;
  return false;
}

module.exports = {
  isWallet,
  getNumberOfContractsMadeByDeployer,
  getBestStatisticFromArrayOfStatistics,
  getBestStatisticFromTransactionObject,
  getContractFromContractCreationTransactionWeb3,
  isErcToken,
  returnContractCreationTransactions,
  getTokenStatisticsForAllDeployments,
  getContractsMadeByDeployer,
  returnContractCreationTransactionToFindOwner,
  stringSanitizer,
  getEthPairAddress,
};
