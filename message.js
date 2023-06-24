

const formatMessage = async function(name, symbol, address, ownersAddress, currentMarketcap, fifteenMinuteChange, chain, ethPair = '') {
    let info;
    console.log('reached message function')
    if (chain === 'bsc') {
        info = `<i><b>${name} (${symbol})</b></i>
📃<b><i>Contract</i></b>: <code>${address}</code>
🥷<a href="https://bscscan.com/address/${ownersAddress}">Dev wallet</a>
💵<b>Mcap</b>: ${currentMarketcap}
💳<b>15 min price change</b>: ${fifteenMinuteChange}
<b>Chain - BSC</b>
📈<a href="https://poocoin.app/tokens/${address}">Chart</a>
<pre>—————————————————————</pre>

`;
    } else {
        info = `<i><b>${name} (${symbol})</b></i>
📃<i>Contract</i>: <code>${address}</code>
🥷<a href="https://etherscan.io/address/${ownersAddress}">Dev wallet</a>
💵<b>Mcap</b>: ${currentMarketcap}
💳<b>15 min price change</b>: ${fifteenMinuteChange}
<b>Chain - ETH</b>
<a href="https://www.dextools.io/app/ether/pair-explorer/${ethPair}">📈Chart</a>
<pre>—————————————————————</pre>

`;
    }
    return info;
}



const getChartScreenshot = async function(chain, address, ethPair = '') {
    // const browser = await puppeteer.launch({executablePath:"/Users/tanujsrivastava/Downloads/chromedriver_mac64/chromedriver", timeout: 60000, headless: "new"});
    // console.log('reached screenshot')
    // const browser = await playwright.chromium.launch({executablePath:"/Users/tanujsrivastava/Downloads/chromedriver_mac64/chromedriver"});
    // const context = await browser.newContext();
    // const page = await context.newPage();
    // if(chain === 'bsc'){ 
    //     let chartUrl = `https://www.dextools.io/app/en/bnb/pair-explorer/${address}`
    // }else{
    //     let chartUrl = `https://www.dextools.io/app/ether/pair-explorer/${ethPair}`
    // }
    // await page.goto(chartUrl);
    // const screenshot = await page.screenshot({ encoding: 'binary' });
    // await browser.close();
    // return screenshot;
}

module.exports = { formatMessage, getChartScreenshot };
