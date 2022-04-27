'use strict';
const settings = require('../config/settings')
const HandlerDB = require('./manga.dynamodb').Handler
const AWS = require('aws-sdk')
const dynamoDB = new AWS.DynamoDB.DocumentClient()
const TelegramBotAPI = require("../utils/TelegramBot")

const puppeteer = require('puppeteer-extra')

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

const TelegramBot = new TelegramBotAPI()

class Handler {

  async get_mangas_updates({ manga, url_global, id, url, last_chapter, list_selector }) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle0',
    });

    const updates = []
    let new_last_chapter = null;
    let link_last_chapter = null;
    const reg1 = /\D+/

    await page.waitForTimeout(1000);

    try {
      let list_of_chapters_html = await page.$(list_selector)
      if (list_of_chapters_html) {
        const elements = await list_of_chapters_html.$$("li");

        for (let index = 0; index < elements.length; index++) {
          const element = elements[index];
          link_last_chapter = await element.$eval("a", el => el.getAttribute("href"))
          let cap_text = await element.$eval(".cap-text", el => el.innerText)
          let cap_number = parseFloat(cap_text.replace(reg1, ""))

          if (new_last_chapter == null) {
            new_last_chapter = cap_number;
          }

          if (new_last_chapter != null && (cap_number > parseFloat(last_chapter)))
            updates.push({ link_last_chapter:(url_global.trim()+link_last_chapter.trim()), cap_text, manga })

        }

      }

    } catch (error) {
      console.log("erro: ", error)
    }

    await browser.close();

    return { id, new_last_chapter, updates }

  }



  async main(event) {

    const { mangas } = await HandlerDB.read_mangas()

    const mangas_scraping = [];

    for (let index = 0; index < mangas.length; index++) {
      const manga = mangas[index];
      try {
        const scraping_result = await this.get_mangas_updates(manga)
        mangas_scraping.push({ ...scraping_result })
      } catch (error) {
        //deu ruim kkkkk
      }

    }
    //filtra os mangas que foram atualizados
    const manga_updateds = mangas_scraping.filter(m => m.updates.length > 0)

    TelegramBot.send_message_to_telegram(`Manga Updates: ${new Date().toLocaleString()}`)

    for (let index = 0; index < manga_updateds.length; index++) {
      const { id, updates, new_last_chapter } = manga_updateds[index];

      // atualizar no banco os caras que foram atualizados
      await HandlerDB.update_manga_lastchapter({ id }, new_last_chapter)

      const messages = updates.map(
        new_chapter => TelegramBot.process_message(
          {
            manga: new_chapter.manga,
            chapter: new_chapter.cap_text,
            url: new_chapter.link_last_chapter
          }
        )
      )

      //notificar no telegram
      messages.map((msg) => TelegramBot.send_message_to_telegram(msg));
    }

    return {
      statusCode: 200
    }
  }
}

const handler = new Handler()
module.exports = handler.main.bind(handler)