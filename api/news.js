export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 尝试多个 RSS 源，依次备选
    const rssSources = [
        'https://rss.sina.com.cn/news/china/focus15.xml',
        'https://rss.sina.com.cn/news/gz/2016.xml',
        'http://www.sohu.com/rss/channel/5894121.xml',
    ];

    for (const rssUrl of rssSources) {
        try {
            const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=10&t=${Date.now()}`;

            const response = await fetch(apiUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
            });

            if (!response.ok) continue;

            const data = await response.json();

            if (data.status !== 'ok' || !data.items || data.items.length === 0) continue;

            const items = data.items.map(item => ({
                title: item.title?.trim() || '',
                link: item.link || '#',
                pubDate: item.pubDate || '',
            })).filter(item => item.title.length > 2);

            if (items.length === 0) continue;

            return res.status(200).json({ items });

        } catch (err) {
            continue;
        }
    }

    // 所有源失败时返回提示
    return res.status(200).json({
        items: [{ title: '暂时无法获取新闻，请稍后刷新重试', link: '#', pubDate: '' }],
    });
}
