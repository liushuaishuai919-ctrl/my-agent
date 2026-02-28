export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { input } = req.body;
  if (!input || !input.trim()) {
    return res.status(400).json({ error: '输入内容不能为空' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key 未配置' });
  }

  const prompt = `你是一位资深职场沟通顾问，擅长将员工的真实想法转化为专业、得体的职场话术。

规则：
1. 保留原意，但用专业、委婉、积极的方式表达
2. 语气正式但不生硬，像一个有职业素养的人说出来的话
3. 字数控制在 60-120 字之间
4. 只输出重构后的话术内容，不要加任何解释或前缀

用户的原话：${input}

请输出重构后的职场话术：`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err.error?.message || 'Gemini API 调用失败' });
    }

    const data = await response.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!output) {
      return res.status(500).json({ error: 'AI 未返回有效内容' });
    }

    return res.status(200).json({ output });
  } catch (err) {
    return res.status(500).json({ error: '服务器内部错误：' + err.message });
  }
}
