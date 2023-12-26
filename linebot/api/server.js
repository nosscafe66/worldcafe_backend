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
    categoryText = matches[1];
    textWithoutCategory = event.message.text.replace(categoryRegex, '').trim();
  }

  let userName = '';
  if (event.source.type === 'user') {
    try {
      const profile = await client.getProfile(event.source.userId);
      userName = profile.displayName;
    } catch (error) {
      console.error('Error getting user profile:', error);
    }
  }

  await insertDataToDatabase(event, textWithoutCategory, categoryText, userName);
}

async function insertDataToDatabase(event, text, category, userName) {
  try {
    const query = `
      INSERT INTO linebot_messages (
        message_id, text, user_id, user_name, group_id, timestamp, reply_token, webhook_event_id, mode, is_redelivery, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

    const values = [
      event.message.id,
      text,
      event.source.userId,
      userName,
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
