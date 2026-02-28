export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { input } = req.body;
  if (!input || !input.trim()) {
    return res.status(400).json({ error: '输入内容不能为空' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key 未配置' });
  }

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
          {
            role: 'system',
            content: `你是一位资深职场沟通顾问，擅长将员工的真实想法转化为专业、得体的职场话术。
规则：
1. 保留原意，用专业、委婉、积极的方式表达
2. 语气正式但不生硬，像一个有职业素养的人说出来的话
3. 字数控制在 60-120 字之间
4. 只输出重构后的话术内容，不要加任何解释或前缀`,
          },
          {
            role: 'user',
            content: `请将以下职场原话重构为专业话术：${input}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err.error?.message || 'Groq API 调用失败' });
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content?.trim();

    if (!output) {
      return res.status(500).json({ error: 'AI 未返回有效内容' });
    }

    return res.status(200).json({ output });
  } catch (err) {
    return res.status(500).json({ error: '服务器内部错误：' + err.message });
  }
}
