const fs = require('fs');
const cacheDebugger = require('debug')('cacheManager');

function doesCachedResponseExist(tokenAddress) {
  const path = './cached-contracts/';

  fs.access(path, fs.constants.F_OK, (err) => {
    // If the directory doesn't exist, create it.
    if (err) {
      fs.mkdir(path, { recursive: true }, (err) => {
        if (err) throw err;
      });
    }
  });
  const filePath = `./cached-contracts/${tokenAddress}.json`;
  const doesFileExist = fs.existsSync(filePath);
  return doesFileExist;
}

function getCachedResponseForContract(tokenAddress) {
  const filePath = `./cached-contracts/${tokenAddress}.json`;
  const doesTheCachedResponseExist = doesCachedResponseExist(tokenAddress);
  cacheDebugger(`doesTheCachedResponseExist: ${doesTheCachedResponseExist}`);

  if (doesTheCachedResponseExist) {
    const cachedContents = fs.readFileSync(filePath);
    const parsedData = JSON.parse(cachedContents);
    const { response, developerWallet } = parsedData;
    return { response, developerWallet };
  }
  return null;
}

function cacheResponseForContract(tokenAddress, response, developerWallet) {
  const filePath = `./cached-contracts/${tokenAddress}.json`;
  const cachedContents = JSON.stringify({
    response,
    timestamp: Date.now() / 1000,
    developerWallet,
  });
  cacheDebugger(`caching contents for ${tokenAddress}`);
  fs.writeFileSync(filePath, cachedContents);
}

function isCachedResponseStale(tokenAddress) {
  const filePath = `./cached-contracts/${tokenAddress}.json`;
  const cachedContents = fs.readFileSync(filePath);
  const parsedData = JSON.parse(cachedContents);
  const { timestamp } = parsedData;
  const currentTimestamp = Date.now() / 1000;
  const difference = currentTimestamp - timestamp;
  const isStale = difference > 60 * 60 * 48;
  cacheDebugger(
    `Cache age ${difference} Is cache stale for ${tokenAddress}? ${isStale}`
  );
  return difference > 60 * 60 * 48;
}

async function removeCachedResponse(tokenAddress) {
  const filePath = `./cached-contracts/${tokenAddress}.json`;
  cacheDebugger(`removing cached response for ${tokenAddress}`);
  fs.unlinkSync(filePath);
}

function cacheIfRequired(addressFromUser, response, developerWallet) {
  if (!doesCachedResponseExist(addressFromUser)) {
    cacheResponseForContract(addressFromUser, response, developerWallet);
  }
}

async function removeCacheIfStale(addressFromUser) {
  if (doesCachedResponseExist(addressFromUser)) {
    if (isCachedResponseStale(addressFromUser)) {
      removeCachedResponse(addressFromUser);
    }
  }
}

module.exports = {
  cacheIfRequired,
  removeCacheIfStale,
  getCachedResponseForContract,
  doesCachedResponseExist,
};
