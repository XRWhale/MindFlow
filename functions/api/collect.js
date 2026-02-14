import { detectSource, fetchInstagramOEmbed, fetchOgMeta, jsonResponse } from './_helpers.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    const apiKey = env.OPENAI_API_KEY;

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    const url = body.url;
    if (!url) return jsonResponse({ error: 'URL is required' }, 400);

    try {
        new URL(url);
    } catch {
        return jsonResponse({ error: 'Invalid URL' }, 400);
    }

    const source = detectSource(url);

    // Step 1: Fetch metadata
    let meta = null;
    try {
        if (source === 'instagram') {
            meta = await fetchInstagramOEmbed(url, env);
        }
        if (!meta) {
            const ogResult = await fetchOgMeta(url, source);
            if (ogResult) {
                meta = {
                    title: ogResult.title,
                    description: ogResult.description,
                    image: ogResult.image,
                    source: ogResult.source
                };
            }
        }
    } catch {
        // metadata fetch failed, continue with empty meta
    }

    if (!meta) {
        meta = { title: '', description: '', image: '', source };
    }

    // Step 2: AI analysis with GPT-4o-mini
    let aiResult = { summary: '', category: '기타', tags: [], intent: '' };

    if (apiKey) {
        const contentText = [
            meta.title && `제목: ${meta.title}`,
            meta.description && `설명: ${meta.description}`,
            `URL: ${url}`
        ].filter(Boolean).join('\n');

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: '당신은 콘텐츠 분석 전문가입니다. 반드시 JSON 형식으로만 응답하세요.'
                        },
                        {
                            role: 'user',
                            content: `다음 콘텐츠를 분석해 아래 4가지를 JSON으로 반환해줘.
출력은 절대 JSON 외 형식이 포함되면 안 돼.

1) summary: 콘텐츠의 핵심을 1문장(최대 140자)으로 요약
2) category: 아래 중 하나로 분류
   ["운동", "비즈니스", "자기계발", "쇼핑", "여행", "요리", "패션", "기술", "라이프스타일", "기타"]
3) tags: 콘텐츠의 주제를 나타내는 태그 3개 (단어 위주)
4) intent: 사용자가 이 콘텐츠를 저장한 의도
   ["배움", "실행", "영감"] 중 하나

반드시 아래 형태로만 출력:
{
  "summary": "",
  "category": "",
  "tags": ["", "", ""],
  "intent": ""
}

<콘텐츠>
${contentText}
</콘텐츠>`
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 300
                })
            });

            if (res.ok) {
                const data = await res.json();
                const content = data.choices?.[0]?.message?.content || '';
                try {
                    const parsed = JSON.parse(content);
                    aiResult = {
                        summary: parsed.summary || '',
                        category: parsed.category || '기타',
                        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [],
                        intent: parsed.intent || ''
                    };
                } catch {
                    // JSON parse failed, keep defaults
                }
            }
        } catch {
            // AI call failed, keep defaults
        }
    }

    return jsonResponse({
        title: meta.title || '',
        summary: aiResult.summary,
        category: aiResult.category,
        tags: aiResult.tags,
        intent: aiResult.intent,
        thumbnail: meta.image || '',
        source: meta.source || source
    });
}
