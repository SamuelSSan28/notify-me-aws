'use strict';
const settings = require('../config/settings')
const HandlerDB = require('./manga.dynamodb')
const AWS = require('aws-sdk')
const dynamoDB = new AWS.DynamoDB.DocumentClient()

const puppeteer = require('puppeteer-extra')

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

class Handler {

  static async get_mangas_updates(url, list_selector) {
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
        link_last_chapter = await first_element.$eval("a", el => el.getAttribute("href"))
        let cap_text = await first_element.$eval(".cap-text", el => el.innerText)
        const reg1 = /\D+/
        last_chapter = parseFloat(cap_text.replace(reg1, ""))
      }

    } catch (error) {
      console.log("erro: ", error)
    }

    await browser.close();

    return { last_chapter, link_last_chapter }

  }



  static async main(event) {

    const manga_updates = await Handler.get_mangas_updates(
      'https://mangalivre.net/manga/yozakura-san-chi-no-daisakusen/8618',
      '.list-of-chapters')

    
    return {
      statusCode: 200
    }
  }
}

module.exports = Handler.main