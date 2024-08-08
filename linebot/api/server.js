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

// insertDataToDatabase 関数を変更して、ユーザー名とユーザーIDを追加します
async function insertDataToDatabase(event, text, userName, userId) {
  try {
    const query = `
      INSERT INTO linebot_messages (
        message_id, text, user_id, group_id, timestamp, reply_token, webhook_event_id, mode, is_redelivery, user_name, user_line_id
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
      userName,
      userId
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

  console.log("event",event)

  // 「問診票」が含まれるメッセージをチェック
  if (event.message.text.includes('問診票')) {
    // ユーザー名とユーザーIDを正規表現で抽出
    const userNameMatch = event.message.text.match(/ユーザー名:\s*(\S+)/);
    const userIdMatch = event.message.text.match(/ユーザーID:\s*(\S+)/);

    if (userNameMatch && userIdMatch) {
      const userName = userNameMatch[1];
      const userId = userIdMatch[1];

      // ユーザー名とユーザーIDを含むデータをデータベースに保存
      await insertDataToDatabase(event, event.message.text, userName, userId);
    }
  }
}

if (process.env.NOW_REGION) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Server running at ${PORT}`);
    });
}
