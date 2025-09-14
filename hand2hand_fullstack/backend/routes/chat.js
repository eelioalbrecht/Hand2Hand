const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  if (!process.env.OPENAI_API_KEY) return res.status(501).json({ error: 'OPENAI_API_KEY not set' });

  try {
    const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600
    }, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    const text = resp.data.choices?.[0]?.message?.content || 'No answer';
    res.json({ answer: text });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: 'chat failed' });
  }
});

module.exports = router;
