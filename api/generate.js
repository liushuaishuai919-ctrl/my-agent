export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, keywords, style, length = 'medium' } = req.body;

  if (!topic) {
    return res.status(400).json({ error: '主题不能为空' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key 未配置，请在 Vercel 中设置 GROQ_API_KEY' });
  }

  // 根据长度滑块调整字数建议
  const lengthGuide = {
    'short': '字数极简，约100字左右，多用短句，适合快节奏。',
    'medium': '字数适中，约300字左右，逻辑完整，有细节有金句。',
    'long': '详细丰富，500字以上，包含深度攻略或长篇故事。'
  };

  const systemPrompt = `你是一位顶级小红书文案专家，擅长创作极具吸引力的“标题党”内容。
你的目标是根据用户提供的数据，生成一篇完美的爆款文案。

规则：
1. **多标题建议**：请一次性生成 3 个不同侧重点（如：反问式、利益点、情绪价值）的标题，每个标题都要有 Emoji。
2. **正文**：遵循“${lengthGuide[length]}”的要求。
3. **敏感词处理**：在生成时主动规避“最”、“第一”、“绝对”、“100%”等小红书违禁词。
4. **输出格式**：必须严格按照以下 JSON 格式返回结果（不要包含任何其他解释）：
{
  "titles": ["标题1", "标题2", "标题3"],
  "body": "生成的正文内容",
  "tags": "#标签1 #标签2 #标签3"
}`;

  // 加入随机因子确保不重复刷新 (Cache Busting for AI)
  const randomSeed = Math.random().toString(36).substring(7);
  const userPrompt = `主题：${topic}
关键词：${keywords || '无'}
文案风格：${style || '干货分享'}
随机指纹：${randomSeed}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9, // 调高温度增加多样性，防止不刷新的感觉
        max_tokens: 1500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err.error?.message || 'AI 生成失败' });
    }

    const data = await response.json();
    const resultStr = data.choices?.[0]?.message?.content;

    try {
      const result = JSON.parse(resultStr);
      return res.status(200).json(result);
    } catch (e) {
      return res.status(500).json({ error: 'AI 返回格式错误' });
    }

  } catch (err) {
    return res.status(500).json({ error: '服务器内部错误: ' + err.message });
  }
}
