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

    if (!body.items || body.items.length === 0) {
        return jsonResponse({ error: 'No items to analyze' }, 400);
    }

    const itemsSummary = body.items.map((item, i) =>
        `[${i + 1}] 제목: ${item.title || '(없음)'}\n` +
        `    요약: ${item.summary || '(없음)'}\n` +
        `    카테고리: ${item.category || '(없음)'}\n` +
        `    태그: ${(item.tags || []).join(', ') || '(없음)'}\n` +
        `    의도: ${item.intent || '(없음)'}\n` +
        `    조회수: ${item.viewCount || 0}\n` +
        `    ID: ${item.id}`
    ).join('\n\n');

    const prompt = `사용자가 최근 7일 동안 저장한 콘텐츠의 분석 결과 리스트입니다.

각 항목은 {title, summary, category, tags, intent, viewCount} 형식입니다.

이 데이터를 기반으로 아래 구조의 리포트를 생성하세요:

1) top_interests: 사용자가 가장 많이 저장한 분야 Top 3 (category와 tags 기반)
   각 항목에 topic(관심사명), count(관련 콘텐츠 수), insight(한줄 인사이트) 포함

2) intent_ratio: 배움 / 영감 / 실행 비율 (합계 1.0, 소수점 2자리)

3) recommended_items: 다시 보면 좋은 콘텐츠 Top 5
   선정 기준:
     - intent가 "실행"인 경우 우선
     - 조회수(viewCount)가 0인 콘텐츠 우선
     - 요약 기준으로 난이도가 낮고 빠르게 볼 수 있는 콘텐츠 우선
   각 항목에 id(아이템 ID), reason(추천 이유) 포함

4) weekly_summary: 이번 주 사용자의 저장 패턴을 2-3문장으로 요약

출력은 아래 JSON 구조만:
{
  "top_interests": [
    { "topic": "", "count": 0, "insight": "" }
  ],
  "intent_ratio": { "배움": 0.0, "영감": 0.0, "실행": 0.0 },
  "recommended_items": [
    { "id": "", "reason": "" }
  ],
  "weekly_summary": ""
}

---
총 ${body.total}개 항목 (분석 시점: ${new Date(body.date).toLocaleString('ko-KR')})

${itemsSummary}`;

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4.1',
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: '당신은 사용자 행동 분석 전문가입니다. 한국어로 응답하세요. 반드시 JSON 형식으로만 응답하세요.'
                    },
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
        const content = data.choices?.[0]?.message?.content || '';

        try {
            const parsed = JSON.parse(content);
            return jsonResponse({
                top_interests: parsed.top_interests || [],
                intent_ratio: parsed.intent_ratio || { '배움': 0, '영감': 0, '실행': 0 },
                recommended_items: parsed.recommended_items || [],
                weekly_summary: parsed.weekly_summary || ''
            });
        } catch {
            return jsonResponse({ error: 'Failed to parse AI response' }, 500);
        }

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
