const fs = require('fs');

function isUserWhitelisted(userId) {
  let whitelisted = false;
  const whiteListData = JSON.parse(fs.readFileSync('./whitelist.json'));
  whiteListData.users.forEach((id) => {
    if (id === userId) {
      whitelisted = true;
    }
  });

  return whitelisted;
}

function isUserPartOfMyGroup(userId, bot) {
  return true;
}

function isGroupWhitelisted(groupId) {
  groupId = parseInt(String(groupId).slice(4), 10);
  let whitelisted = false;
  const whiteListData = JSON.parse(fs.readFileSync('./whitelist.json'));
  whiteListData.groups.forEach((id) => {
    if (id === groupId) {
      whitelisted = true;
    }
  });

  return whitelisted;
}

module.exports = { isUserWhitelisted, isGroupWhitelisted };
