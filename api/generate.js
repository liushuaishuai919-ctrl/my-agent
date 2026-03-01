export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { input, lang = 'zh' } = req.body;
  if (!input || !input.trim()) {
    return res.status(400).json({ error: lang === 'en' ? 'Input cannot be empty' : '输入内容不能为空' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not configured' });
  }

  const systemPrompt = lang === 'en'
    ? `You are a senior professional workplace communication coach. Rephrase the user's raw thoughts into polished, professional, and diplomatic workplace language.
Rules:
1. Preserve the original intent but express it professionally and tactfully
2. Use a formal yet natural tone — like something a highly professional person would genuinely say
3. Keep the response between 40-80 words
4. Output only the rephrased text, no explanation or prefix`
    : `你是一位资深职场沟通顾问，擅长将员工的真实想法转化为专业、得体的职场话术。
规则：
1. 保留原意，用专业、委婉、积极的方式表达
2. 语气正式但不生硬，像一个有职业素养的人说出来的话
3. 字数控制在 60-120 字之间
4. 只输出重构后的话术内容，不要加任何解释或前缀`;

  const userPrompt = lang === 'en'
    ? `Please rephrase the following workplace thought into a professional phrase: ${input}`
    : `请将以下职场原话重构为专业话术：${input}`;

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
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err.error?.message || 'Groq API error' });
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content?.trim();

    if (!output) {
      return res.status(500).json({ error: lang === 'en' ? 'No response from AI' : 'AI 未返回有效内容' });
    }

    return res.status(200).json({ output });
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
