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

async function insertDataToDatabase(event, text, userName, userId) {
  try {
    const query = `
      INSERT INTO linebot_messages (
        message_id, text, user_id, timestamp, user_name, user_line_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`;

    const values = [
      event.message.id,
      text,
      event.source.userId,
      event.timestamp,
      userName,
      userId
    ];

    console.log('Inserting data to database with values:', values); // デバッグ用ログ

    await pool.query(query, values);
    console.log('Data inserted successfully');
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
    res.set({
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store'
    });
    res.json(data);
  } catch (err) {
    res.status(500).set({
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      'Vercel-CDN-Cache-Control': 'no-store'
    }).send('Server error');
  }
});

app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.set({
          'Cache-Control': 'no-store',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store'
        }).json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).set({
              'Cache-Control': 'no-store',
              'CDN-Cache-Control': 'no-store',
              'Vercel-CDN-Cache-Control': 'no-store'
            }).end();
        });
});

const client = new line.Client(config);

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  console.log("Event received:", event); // デバッグ用ログ

  // 「問診票」が含まれるメッセージをチェック
  if (event.message.text.includes('問診票')) {
    // ユーザー名とユーザーIDを正規表現で抽出
    const userNameMatch = event.message.text.match(/ユーザー名:\s*(\S+)/);
    const userIdMatch = event.message.text.match(/ユーザーID:\s*(\S+)/);

    if (userNameMatch && userIdMatch) {
      const userName = userNameMatch[1];
      const userId = userIdMatch[1];

      console.log("Extracted data:", { userName, userId }); // デバッグ用ログ

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
