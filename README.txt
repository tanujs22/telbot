Steps on how to run this bot.


STEP 1: 
Go to @BotFather on Telegram and create a bot  (You can skip step 1 - 3 if you want to use the existing PastCoinBot token)

STEP 2:
Copy the Bot Token

Step 3: 
Add this to the config file.
Be sure to add that bot to the scans group and make it admin!

STEP 4:
Create a Moralis account, Bitquery account, BscScan account and Etherscan acccount
Copy the API Keys and add them to the config file

STEP 5:
Install Nodejs
https://nodejs.org/en/

STEP 6:
Open up a terminal and run "npm i -g pm2"

STEP 7:

Run "npm i" (make sure you are in the working directory of the code)

STEP 8:
Run "pm2 start .\index.js" (make sure you are in the working directory of the code)

If you'd like to stop running the bot, please run:

"pm2 stop .\index.js" (make sure you are in the working directory of the code)