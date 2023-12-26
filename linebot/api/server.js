'use strict';

require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const { Pool } = require('pg');
const PORT = process.env.PORT || 3000;

const config = {
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    channelAccessToken: process.env.LINE_CHANNEL_ACCESSTOKEN
};

const app = express();

// PostgreSQLデータベースへの接続設定
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function insertDataToDatabase(event, text, category) {
  try {
    const query = `
      INSERT INTO linebot_messages (
        message_id, text, user_id, group_id, timestamp, reply_token, webhook_event_id, mode, is_redelivery, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;

    const values = [
      event.message.id,
      text,
      event.source.userId,
      event.source.groupId,
      event.timestamp,
      event.replyToken,
      event.webhookEventId,
      event.mode,
      event.deliveryContext.isRedelivery,
      category
    ];

    await pool.query(query, values);
  } catch (err) {
    console.error('Error inserting data to database:', err);
  }
}

async function fetchAllData() {
  try {
    const { rows } = await pool.query('SELECT * FROM linebot_messages');
    return rows;
  } catch (err) {
    console.error('Error fetching all data from database:', err);
    throw err;
  }
}

app.get('/', async (req, res) => {
  try {
    const data = await fetchAllData();
    res.json("このサーバーはLINE Botのためのものです。");
  } catch (err) {
    res.status(500).send('Server error');
  }
});

app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

const client = new line.Client(config);

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const categoryRegex = /カテゴリ：(.+)/;
  const matches = event.message.text.match(categoryRegex);
  let categoryText = '';
  let textWithoutCategory = event.message.text;

  if (matches) {
    // カテゴリのテキストを取得
    categoryText = matches[1];

    // メッセージからカテゴリのテキストを取り除く
    textWithoutCategory = event.message.text.replace(categoryRegex, '').trim();
  }

  // カテゴリを含むイベントデータをデータベースに保存（カテゴリ除外済みのテキストを使用）
  await insertDataToDatabase(event, textWithoutCategory, categoryText);
}

if (process.env.NOW_REGION) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Server running at ${PORT}`);
    });
}
