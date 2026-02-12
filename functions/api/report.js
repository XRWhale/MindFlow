export async function onRequestPost(context) {
    const { request, env } = context;
    const apiKey = env.OPENAI_API_KEY;

    if (!apiKey) {
        return jsonResponse({ error: 'OpenAI API key not configured' }, 500);
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    if (!body.posts || body.posts.length === 0) {
        return jsonResponse({ error: 'No posts to analyze' }, 400);
    }

    const postsSummary = body.posts.map((p, i) =>
        `[${i + 1}] ${p.title || '(제목 없음)'}\n` +
        `    설명: ${p.caption || p.text || '(없음)'}\n` +
        `    URL: ${p.url || '(없음)'}`
    ).join('\n\n');

    const prompt = `사용자가 최근 저장한 콘텐츠 목록입니다.
관심사 패턴, 감정 흐름, 트렌드, 잠재 니즈를 분석하여
다음 섹션으로 구성된 리포트(Markdown)를 생성하세요:

1) 요약
2) 주요 관심사 Top3
3) 반복 등장하는 키워드
4) 감정/의도 분석
5) 저장 패턴 정리
6) 앞으로의 추천

---
총 ${body.total}개 항목 (분석 시점: ${new Date(body.date).toLocaleString('ko-KR')})

${postsSummary}`;

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: '당신은 사용자 행동 분석 전문가입니다. 한국어로 응답하세요.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return jsonResponse({ error: err.error?.message || 'OpenAI API error' }, 502);
        }

        const data = await res.json();
        const markdown = data.choices?.[0]?.message?.content || '';

        return jsonResponse({ markdown });

    } catch (err) {
        return jsonResponse({ error: 'OpenAI request failed: ' + err.message }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
