'use strict';
const settings = require('./config/settings')
const AWS = require('aws-sdk')
const uuid = require('uuid')
const dynamoDB = new AWS.DynamoDB.DocumentClient()
const fs = require('fs');

const puppeteer = require('puppeteer-extra')

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

class Handler {


  async get_mangas_from_db() {

  }

  static async get_mangas_updates(url,list_selector) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: 'networkidle0',
    });
    let last_chapter = null;
    let link_last_chapter = null;

    await page.waitForTimeout(1000);

    try {
      let list_of_chapters_html = await page.$(list_selector)
      if (list_of_chapters_html) {
        const elements = await list_of_chapters_html.$$("li");
        const first_element = elements[0]

        //const last_chapter_info = await first_element.evaluate('document.querySelector("a").getAttribute("href")')
        //console.log(last_chapter_info)

        link_last_chapter = await first_element.$eval("a", el => el.getAttribute("href"))
        let cap_text = await first_element.$eval(".cap-text", el => el.innerText)
        const reg1 = /\D+/
        last_chapter = parseFloat(cap_text.replace(reg1, ""))
      }

    } catch (error) {
      console.log("erro: ", error)
    }

    await browser.close();

    return {last_chapter,link_last_chapter}

  }

  async save_mangas_updates(data) {
    for (let index = 0; index < data.length; index++) {
      const { manga, id, ultimo_cap } = data[index];

    }
  }

  static async create_mangas(event) {

    const params = {
      TableName: settings.dbTableName,
      Item: {
        commitMessage,
        id: uuid.v1(),
        createdAt: new Date().toISOString()
      }
    }

    await dynamoDB.put(params).promise()

  }


  static async main(event) {
    
    const manga_updates = await Handler.get_mangas_updates(
      'https://mangalivre.net/manga/yozakura-san-chi-no-daisakusen/8618',
      '.list-of-chapters')

    console.log(manga_updates)
    return {
      statusCode: 200
    }
  }
}
module.exports = {
  scheduler: Handler.main,
  create_api: Handler.create_mangas
}