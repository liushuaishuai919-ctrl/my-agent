export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, keywords, style } = req.body;

  if (!topic) {
    return res.status(400).json({ error: '主题不能为空' });
  }

  const apiKey = process.env.GROQ_API_KEY; // 请确保在 Vercel 环境变量中配置此项
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key 未配置，请联系管理员' });
  }

  const systemPrompt = `你是一位顶级小红书文案专家，擅长创作极具吸引力的“标题党”内容，并深谙小红书的流量密码。
你的目标是根据用户提供的主题、关键词和风格，生成一篇完美的爆款文案。

规则：
1. **标题**：极其吸引眼球，必须包含至少1个Emoji，字数控制在20字内。
2. **正文**：结构清晰（痛点+方案+金句），分段明确，每段话结尾或重点处必须插入贴切的Emoji。
3. **标签**：生成3-5个相关的热门话题标签（以#开头）。
4. **输出格式**：必须严格按照以下 JSON 格式返回结果（不要包含任何其他解释）：
{
  "title": "生成的标题",
  "body": "生成的正文内容",
  "tags": "#标签1 #标签2 #标签3"
}`;

  const userPrompt = `主题：${topic}
关键词：${keywords || '无'}
文案风格：${style || '干货分享'}`;

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
        temperature: 0.85,
        max_tokens: 1000,
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
