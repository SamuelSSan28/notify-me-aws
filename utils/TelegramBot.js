const TelegramBot  = require('node-telegram-bot-api');
const settings = require('../config/settings')

class MyTelegramBot {

    process_message({manga,chapter,url}){
        const message = `${chapter} de ${manga} \n ${url}`;
        return message
    }

    async send_message_to_telegram (msg)  {    
        try{
            const bot = new TelegramBot(settings.BOT_TOKEN);
            await bot.sendMessage(settings.GROUP_ID, msg);
        }catch(err){
            console.log("ERRO TELEGRAM")
        }     
    }
}

module.exports = MyTelegramBot
