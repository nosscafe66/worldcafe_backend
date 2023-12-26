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

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// insertDataToDatabase 関数も変更して、イベント内容の引数を追加します
async function insertDataToDatabase(event, text, category, eventContent) {
  try {
    const query = `
      INSERT INTO linebot_messages (
        message_id, text, user_id, group_id, timestamp, reply_token, webhook_event_id, mode, is_redelivery, category, event_content
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

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
      category,
      eventContent
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
  const eventContentRegex = /イベント内容：(.+)/;

  const categoryMatches = event.message.text.match(categoryRegex);
  const eventContentMatches = event.message.text.match(eventContentRegex);

  let categoryText = '';
  let eventContentText = '';
  let textWithoutCategoryAndEventContent = event.message.text;

  if (categoryMatches) {
    // カテゴリのテキストを取得
    categoryText = categoryMatches[1];

    // メッセージからカテゴリのテキストを取り除く
    textWithoutCategoryAndEventContent = textWithoutCategoryAndEventContent.replace(categoryRegex, '').trim();
  }

  if (eventContentMatches) {
    // イベント内容のテキストを取得
    eventContentText = eventContentMatches[1];

    // メッセージからイベント内容のテキストを取り除く
    textWithoutCategoryAndEventContent = textWithoutCategoryAndEventContent.replace(eventContentRegex, '').trim();
  }

  // カテゴリとイベント内容を含むイベントデータをデータベースに保存
  await insertDataToDatabase(event, textWithoutCategoryAndEventContent, categoryText, eventContentText);
}

if (process.env.NOW_REGION) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Server running at ${PORT}`);
    });
}
