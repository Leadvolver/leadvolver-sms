const Anthropic = require('@anthropic-ai/sdk');

function getClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    defaultHeaders: { 'anthropic-beta': 'web-search-2025-03-05' },
  });
}

async function runAgenticLoop(client, params) {
  const messages = [...params.messages];
  let iterations = 0;

  while (iterations < 8) {
    iterations++;
    const response = await client.messages.create({ ...params, messages });
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text')?.text || '';
      return text;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = response.content
        .filter(b => b.type === 'tool_use')
        .map(b => ({ type: 'tool_result', tool_use_id: b.id, content: '' }));
      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return '';
}

async function findLeads(city, industries) {
  const client = getClient();
  const industryList = industries.join(', ');

  const systemPrompt = `You are a B2B lead researcher. Find REAL home improvement business owners.

Only include people who are:
- Owner, Founder, Co-Owner, or Proprietor (NOT managers or employees)
- Running a company with roughly 1-20 employees
- Active online (have a website, Google Business, or social media presence)

Return ONLY a valid JSON array. No explanation, no markdown. Just the raw JSON array.

Each object must have exactly these fields:
{
  "name": "Full Name",
  "title": "Owner/Founder/etc",
  "company": "Company Name",
  "industry": "Solar|Roofing|Renovation|HVAC|Remodeling|Design",
  "city": "City, State",
  "email": "email@domain.com or null",
  "phone": "phone number or null",
  "website": "https://... or null",
  "linkedin": "https://linkedin.com/in/... or null",
  "score": 85,
  "score_reason": "Owner, active website, positive reviews"
}`;

  const text = await runAgenticLoop(client, {
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: systemPrompt,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `Search Google and LinkedIn for home improvement business owners in ${city}.
Target industries: ${industryList}

Use these search queries:
${industries.map(i => `- site:linkedin.com/in "${city}" "${i}" owner OR founder`).join('\n')}
${industries.map(i => `- "${city} ${i} company" owner email`).join('\n')}

Find 8-12 qualified leads. Return ONLY a JSON array.`
    }]
  });

  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]); }
  catch { return []; }
}

async function analyzePastedContent(content) {
  const client = getClient();

  const text = await runAgenticLoop(client, {
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `Extract lead information from pasted text. Return ONLY a JSON object with these fields:
name, title, company, industry (Solar/Roofing/Renovation/HVAC/Remodeling/Design/Unknown), city, email, phone, website, linkedin, score (1-100), score_reason.
Use null for missing fields. Return raw JSON only.`,
    tools: [],
    messages: [{ role: 'user', content: `Extract lead info from:\n\n${content}` }]
  });

  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); }
  catch { return null; }
}

async function generateColdEmail(lead, emailNumber = 1) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const isFollowUp = emailNumber > 1;
  const followUpLabels = ['', '', 'second', 'third', 'fourth', 'fifth'];
  const label = followUpLabels[emailNumber] || `#${emailNumber}`;

  const prompt = isFollowUp
    ? `Write a ${label} follow-up cold email to ${lead.name}, owner of ${lead.company} (${lead.industry} company in ${lead.city}).
       Keep it SHORT (3-4 sentences). Reference that you reached out before. Stay friendly, not pushy.
       Add a fresh angle or value proposition. End with a simple question.`
    : `Write a cold outreach email to ${lead.name}, owner of ${lead.company} (${lead.industry} company in ${lead.city}).

       From: LeadVolver (a service that helps home improvement companies get more leads and clients)

       Rules:
       - Subject line: personalized, not salesy
       - Opening: reference something specific about their business or industry
       - Body: explain how we help ${lead.industry} companies get more clients (lead gen, online presence)
       - Call to action: ask for a 15-min call
       - Length: 5-7 sentences total
       - Tone: professional but human, not corporate

       Return JSON: { "subject": "...", "body": "..." }`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); }
    catch {}
  }

  // Fallback: parse subject/body from plain text
  const subjectMatch = text.match(/subject[:\s]+(.+)/i);
  const bodyStart = text.indexOf('\n\n');
  return {
    subject: subjectMatch ? subjectMatch[1].trim() : `Quick question for ${lead.company}`,
    body: bodyStart > -1 ? text.slice(bodyStart).trim() : text
  };
}

async function generateLinkedInMessage(lead) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Write a LinkedIn connection request message to ${lead.name}, owner of ${lead.company} (${lead.industry} in ${lead.city}).

From: LeadVolver (helps home improvement companies get more clients)
Rules:
- Max 300 characters (LinkedIn limit)
- Sound human, not robotic
- Reference their industry specifically
- End with a reason to connect

Return ONLY the message text, nothing else.`
    }]
  });

  return response.content[0]?.text?.trim() || '';
}

module.exports = { findLeads, analyzePastedContent, generateColdEmail, generateLinkedInMessage };
