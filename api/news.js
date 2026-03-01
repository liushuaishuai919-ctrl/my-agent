export default async function handler(req, res) {
    // 设置 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        // 使用网易新闻 RSS
        const response = await fetch(
            'https://news.163.com/special/00011K6L/rss_newstop.xml',
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
                },
            }
        );

        if (!response.ok) {
            throw new Error('RSS 获取失败');
        }

        const xml = await response.text();

        // 解析 RSS item
        const items = [];
        const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

        for (const match of itemMatches) {
            const block = match[1];

            const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                block.match(/<title>(.*?)<\/title>/))?.[1]?.trim();

            const link = (block.match(/<link><!\[CDATA\[(.*?)\]\]><\/link>/) ||
                block.match(/<link>(.*?)<\/link>/) ||
                block.match(/<link\s*\/>([\s\S]*?)<\/link>/))?.[1]?.trim() ||
                block.match(/<link>(https?:\/\/[^\s<]+)/)?.[1]?.trim();

            const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim();

            if (title && title.length > 2) {
                items.push({ title, link: link || '#', pubDate: pubDate || '' });
            }

            if (items.length >= 10) break;
        }

        return res.status(200).json({ items });
    } catch (err) {
        // 备用：返回固定示例数据
        return res.status(200).json({
            items: [
                { title: '新闻数据暂时无法加载，请稍后刷新重试', link: '#', pubDate: '' },
            ],
            error: err.message,
        });
    }
}
