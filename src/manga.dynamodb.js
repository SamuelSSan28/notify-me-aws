'use strict';
const settings = require('../config/settings')
const AWS = require('aws-sdk')
const uuid = require('uuid')
const dynamoDB = new AWS.DynamoDB.DocumentClient()
const Joi = require('@hapi/joi')
const decoratorValidator = require('../utils/decoratorValidator')

class Handler {

  async insertItem(params) {
    return dynamoDB.put(params).promise()
  }

  static async update_manga_lastchapter(key, last_chapter) {
    const params = {
      TableName: settings.dbTableName,
      Key: key,
      UpdateExpression: "set last_chapter = :r",
      ExpressionAttributeValues: {
        ":r": last_chapter
      },
      ReturnValues: "UPDATED_NEW"
    };

    return dynamoDB.update(params).promise()
  }

  static validator() {
    return Joi.object({
      manga: Joi.string().required(),
      url: Joi.string().required(),
      url_global: Joi.string().required(),
      list_selector: Joi.string().required(),
      last_chapter: Joi.number().required(),
    })
  }

  prepareData(data) {
    const params = {
      TableName: settings.dbTableName,
      Item: {
        ...data,
        id: uuid.v1(),
        createdAt: new Date().toISOString()
      }
    }
    return params
  }

  static async read_mangas() {
    const params = {
      TableName: settings.dbTableName,
    };

    const scanResults = [];
    let items = null;
    do {
      items = await dynamoDB.scan(params).promise();
      items.Items.forEach((item) => scanResults.push(item));
      params.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey !== "undefined");

    return { mangas: scanResults }
  }

  handlerSuccess(data) {
    const response = {
      statusCode: 200,
      body: JSON.stringify(data)
    }
    return response
  }
  handleError(data) {
    return {
      statusCode: data.statusCode || 501,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t create item!!'
    }
  }

  async main(event) {
    try {
      // agora o decorator modifica o body e já
      // retorna no formato JSON
      const data = event.body

      const dbParams = this.prepareData(data)
      await this.insertItem(dbParams)
      return this.handlerSuccess(dbParams.Item)
    } catch (error) {
      console.error('Deu ruim**', error.stack)
      return this.handleError({ statusCode: 500 })
    }
  }

}

const handler = new Handler()

module.exports = {
  Handler,
  api:  decoratorValidator(
    handler.main.bind(handler),
    Handler.validator(),
    'body')
}