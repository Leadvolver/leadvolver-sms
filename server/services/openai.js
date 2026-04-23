function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Set it in Settings.');
  }
  const { default: OpenAI } = require('openai');
  return new OpenAI({ apiKey });
}

function buildSystemPrompt(config) {
  const goalMap = {
    'Book a Call': 'get them to book a call',
    'Get Quote': 'get them to request a new quote',
    'Requalify Interest': 'requalify their interest in moving forward with the project'
  };
  const goal = goalMap[config.goal] || config.goal;

  return `You are ${config.persona_name || 'a scheduling assistant'}, a scheduling assistant for ${config.company_name || 'our company'}. Your job is to re-engage homeowners who previously inquired about renovation services but never moved forward. Be friendly, brief, and human. Never write more than 2-3 sentences per message. Your goal is to ${goal}. If the person shows interest, move them toward booking a call. If they say they are not interested, thank them politely and do not follow up. Never reveal you are an AI. If directly asked, say you are a scheduling assistant. Do not use emojis.`;
}

async function generateReply(config, conversationHistory, inboundMessage) {
  const client = getClient();

  const messages = [
    { role: 'system', content: buildSystemPrompt(config) },
    ...conversationHistory.map(msg => ({
      role: msg.direction === 'outbound' ? 'assistant' : 'user',
      content: msg.content
    })),
    { role: 'user', content: inboundMessage }
  ];

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 150,
    temperature: 0.7
  });

  return completion.choices[0].message.content.trim();
}

async function generateFollowUp(config, lead, messageNumber, conversationHistory) {
  const client = getClient();

  const styleMap = {
    'Casual': 'Keep your tone casual, warm, and conversational like a text from a friend.',
    'Professional': 'Keep your tone professional and courteous.',
    'Urgent': 'Be slightly more urgent, mentioning limited availability or a time-sensitive opportunity without being pushy.'
  };
  const style = styleMap[config.followup_style] || styleMap['Professional'];

  const systemPrompt = `${buildSystemPrompt(config)} ${style} This is follow-up message number ${messageNumber} and the lead has not responded yet. Do not repeat the same message verbatim each time. Keep it fresh, brief, and natural.`;

  const context = lead.job_type && lead.quote_amount
    ? `This lead previously inquired about ${lead.job_type} and received a quote of ${lead.quote_amount}. Generate a follow-up re-engagement message. Do not start with their name.`
    : `This lead previously inquired about home renovation services. Generate a follow-up re-engagement message. Do not start with their name.`;

  const messages = [{ role: 'system', content: systemPrompt }];

  if (conversationHistory && conversationHistory.length > 0) {
    messages.push(...conversationHistory.map(msg => ({
      role: msg.direction === 'outbound' ? 'assistant' : 'user',
      content: msg.content
    })));
  }

  messages.push({ role: 'user', content: context });

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 150,
    temperature: 0.85
  });

  return completion.choices[0].message.content.trim();
}

module.exports = { generateReply, generateFollowUp, buildSystemPrompt };
