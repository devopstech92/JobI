const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 🔑 This will be set in Render later
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

// Read base resume and prompt
const BASE_RESUME = fs.readFileSync(path.join(__dirname, 'base-resume.txt'), 'utf-8');
const PROMPT_TEMPLATE = fs.readFileSync(path.join(__dirname, 'prompt.txt'), 'utf-8');

app.post('/generate', async (req, res) => {
  const { jobPost } = req.body;

  if (!jobPost) {
    return res.status(400).json({ error: 'Job post is required' });
  }

  const finalPrompt = PROMPT_TEMPLATE
    .replace('{{JOB_POST}}', jobPost)
    .replace('{{BASE_RESUME}}', BASE_RESUME);

  try {
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'qwen-turbo',
        input: { prompt: finalPrompt },
        parameters: { result_format: 'text' }
      },
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiOutput = response.data.output.text;

    const resume = aiOutput.split('### TAILORED RESUME')[1]?.split('### COVER LETTER')?.[0]?.trim() || "Not generated";
    const coverLetter = aiOutput.split('### COVER LETTER')[1]?.split('### EMAIL DRAFT')?.[0]?.trim() || "Not generated";
    const email = aiOutput.split('### EMAIL DRAFT')[1]?.trim() || "Not generated";

    res.json({ resume, coverLetter, email });

  } catch (error) {
    console.error('AI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate documents' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
