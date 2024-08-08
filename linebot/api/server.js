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

async function insertDataToDatabase(event, notificationType, userName, userId, registrationDate, questionnaireId) {
  try {
    const query = `
      INSERT INTO linebot_messages (
        message_id, notification_type, user_name, user_id, registration_date, questionnaire_id, timestamp, reply_token, webhook_event_id, mode, is_redelivery
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

    const values = [
      event.message.id,
      notificationType,
      userName,
      userId,
      registrationDate,
      questionnaireId,
      event.timestamp,
      event.replyToken,
      event.webhookEventId,
      event.mode,
      event.deliveryContext.isRedelivery
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

  console.log("Event received:", event); // デバッグ用ログ

  // メッセージから各情報を正規表現で抽出
  const notificationTypeMatch = event.message.text.match(/^\[([^\]]+)\]/);
  const userNameMatch = event.message.text.match(/ユーザー名:\s*(.+)/);
  const userIdMatch = event.message.text.match(/ユーザーID:\s*(\S+)/);
  const registrationDateMatch = event.message.text.match(/登録日時:\s*([^\n]+)/);
  const questionnaireIdMatch = event.message.text.match(/問診票ID:\s*(\S+)/);

  if (notificationTypeMatch && userNameMatch && userIdMatch && registrationDateMatch && questionnaireIdMatch) {
    const notificationType = notificationTypeMatch[1];
    const userName = userNameMatch[1];
    const userId = userIdMatch[1];
    const registrationDate = registrationDateMatch[1];
    const questionnaireId = questionnaireIdMatch[1];

    console.log("Extracted data:", { notificationType, userName, userId, registrationDate, questionnaireId }); // デバッグ用ログ

    // 各情報を含むデータをデータベースに保存
    await insertDataToDatabase(event, notificationType, userName, userId, registrationDate, questionnaireId);
  } else {
    console.log("Failed to match all required fields."); // デバッグ用ログ
  }
}

if (process.env.NOW_REGION) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Server running at ${PORT}`);
    });
}
