export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, keywords, style, length = '300' } = req.body;

  if (!topic) {
    return res.status(400).json({ error: '主题不能为空' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key 未配置，请在 Vercel 中设置 GROQ_API_KEY' });
  }

  // 根据长度滑块调整字数建议
  const lengthGuide = {
    '100': '字数极简，约100字左右，核心利益点突出，适合快节奏。',
    '200': '精简干货，约200字左右，结构清晰，去除废话。',
    '300': '标准丰富，约300字左右，逻辑完整，有细节有金句。',
    '400': '内容详实，约400字左右，包含较多案例或深度拆解。',
    '500': '深度长文，约500字以上，包含完整攻略、多点论证或长篇故事。'
  };

  const systemPrompt = `你是一位由于热爱生活而走红的小红书头部博主，拥有极强的“人格魅力”和“网感”。
你的目标是把冷冰冰的 AI 生成感彻底抹除，写出那种“一眼真”、像真人亲手敲出来的爆款文案。

⚠️ 核心指令（去 AI 味专项）：
1. **禁排比、禁总结**：绝对禁止使用“不仅...而且”、“此外”、“总而言之”、“综上所述”等公文语气。
2. **第一人称叙事**：必须以“我”的视角出发。多分享“我的尴尬瞬间”、“我的意外发现”、“我亲测的雷点”。
3. **情绪化表达**：多用语气助词（啊、惹、呜呜、哈、真的绝了）。适当加入一些“反差感”和“小脾气”，比如“虽然但是”、“我不允许还有人不知道”、“听我一句劝”。
4. **口语化排版**：不要用死板的 1. 2. 3.。多用短句加 Emoji 的形式，像是在跟闺蜜聊天一样随性。

规则：
1. **多标题建议**：3个标题要风格迥异。标题1（反问/吐槽式）、标题2（利益点/反转式）、标题3（随性的日常分享）。
2. **正文**：遵循“${lengthGuide[length]}”的要求。
3. **敏感词处理**：规避小红书违禁词，但语气要自然，多用谐音或隐喻（如“姐妹们快冲”代替“全网最火”）。
4. **输出格式**：必须严格按照以下 JSON 格式返回结果（不要包含任何其他解释）：
{
  "titles": ["标题1", "标题2", "标题3"],
  "body": "生成的人格化正文内容",
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
      // 增强鲁棒性：剥离可能存在的 Markdown 代码块标记
      const cleanedStr = resultStr.replace(/```json\n?|```/g, '').trim();
      const result = JSON.parse(cleanedStr);
      return res.status(200).json(result);
    } catch (e) {
      console.error('JSON Parse Error:', e, 'Raw Content:', resultStr);
      return res.status(500).json({ error: 'AI 返回内容格式解析失败，请重试' });
    }

  } catch (err) {
    return res.status(500).json({ error: '服务器内部错误: ' + err.message });
  }
}
