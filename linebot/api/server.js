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

// Webhookのリクエスト全体をログに出力する関数
function logWebhookRequest(req) {
  console.log('========== WEBHOOK REQUEST START ==========');
  console.log('REQUEST HEADERS:', JSON.stringify(req.headers, null, 2));
  console.log('REQUEST BODY:', JSON.stringify(req.body, null, 2));
  console.log('========== WEBHOOK REQUEST END ==========');
}

app.post('/webhook', line.middleware(config), (req, res) => {
    // Webhookリクエスト全体をログに出力
    logWebhookRequest(req);
    
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.set({
          'Cache-Control': 'no-store',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store'
        }).json(result))
        .catch((err) => {
            console.error('ERROR HANDLING WEBHOOK:', err);
            res.status(500).set({
              'Cache-Control': 'no-store',
              'CDN-Cache-Control': 'no-store',
              'Vercel-CDN-Cache-Control': 'no-store'
            }).end();
        });
});

const client = new line.Client(config);

async function handleEvent(event) {
  // 完全なイベントオブジェクトをログに出力
  console.log('========== LINE EVENT ==========');
  console.log(JSON.stringify(event, null, 2));
  
  // イベントタイプをログに出力
  console.log('Event Type:', event.type);
  
  // ソース情報 (ユーザー、グループなど) をログに出力
  console.log('Source Type:', event.source.type);
  console.log('User ID:', event.source.userId || 'Not available');
  
  // グループメッセージの場合
  if (event.source.type === 'group') {
    console.log('Group ID:', event.source.groupId);
  }
  
  // ルームメッセージの場合
  if (event.source.type === 'room') {
    console.log('Room ID:', event.source.roomId);
  }
  
  // メッセージイベントの場合
  if (event.type === 'message') {
    console.log('Message Type:', event.message.type);
    
    // テキストメッセージの場合
    if (event.message.type === 'text') {
      console.log('Message Text:', event.message.text);
    }
  }
  
  console.log('========== END LINE EVENT ==========');
  
  // 必要に応じてイベントを処理
  // デフォルトの応答
  return Promise.resolve(null);
}

if (process.env.NOW_REGION) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Server running at ${PORT}`);
    });
}