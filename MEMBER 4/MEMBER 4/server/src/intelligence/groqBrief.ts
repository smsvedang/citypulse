import type { EvidenceObject, GroqBrief } from '../types/civic.js';

export function fallbackBrief(evidence: EvidenceObject): GroqBrief {
  const headline = evidence.top_anomaly
    ? `Possible disruption cluster detected in ${evidence.zone}.`
    : `Elevated activity may be present in ${evidence.zone}.`;

  const types = evidence.preceding_events.join(', ') || 'multiple signal types';
  const what =
    evidence.top_anomaly != null
      ? `${types} were observed with a ${evidence.top_anomaly.type} anomaly score of ${evidence.top_anomaly.score}.`
      : `${evidence.active_events} active events were recorded in this zone.`;

  const corr =
    evidence.possible_correlations.length > 0
      ? ' Some events occurred close in time and space; this suggests a possible relationship, not proven causation.'
      : '';

  return {
    headline,
    what_happened: what + corr,
    why_it_matters:
      'Operators may want to monitor transit and traffic in this area while confirming ground conditions.',
    evidence: [
      `Active events: ${evidence.active_events}`,
      evidence.top_anomaly
        ? `Top anomaly: ${evidence.top_anomaly.type} (${evidence.top_anomaly.score})`
        : 'No anomaly above threshold yet',
    ],
    uncertainty: evidence.uncertainty,
    source: 'fallback',
  };
}

export async function generateGroqBrief(evidence: EvidenceObject): Promise<GroqBrief> {
  const key = process.env.GROQ_API_KEY?.trim();
  const model = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';

  if (!key) {
    return fallbackBrief(evidence);
  }

  const system = `You generate grounded civic situation briefs. Use ONLY the evidence JSON provided.
Never invent events, numbers, or locations. Never claim causation from correlation.
Return JSON only with keys: headline, what_happened, why_it_matters, evidence (string array), uncertainty.`;

  const user = JSON.stringify(evidence);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!res.ok) {
      return fallbackBrief(evidence);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return fallbackBrief(evidence);

    const parsed = JSON.parse(raw) as GroqBrief;
    if (!parsed.headline || !parsed.what_happened) {
      return fallbackBrief(evidence);
    }

    return {
      headline: parsed.headline,
      what_happened: parsed.what_happened,
      why_it_matters: parsed.why_it_matters || '',
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      uncertainty: parsed.uncertainty || evidence.uncertainty,
      source: 'groq',
    };
  } catch {
    return fallbackBrief(evidence);
  }
}

export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}
