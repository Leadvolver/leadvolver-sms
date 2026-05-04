const express = require('express');
const router = express.Router();
const { findLeads, analyzePastedContent } = require('../services/claude');

router.post('/search', async (req, res) => {
  const { city, industries } = req.body;
  if (!city || !industries || !industries.length) {
    return res.status(400).json({ error: 'city and industries required' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }
  try {
    const leads = await findLeads(city, industries);
    res.json({ leads });
  } catch (err) {
    console.error('[Finder] Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyze', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  try {
    const lead = await analyzePastedContent(content);
    if (!lead) return res.status(422).json({ error: 'Could not extract lead info' });
    res.json({ lead });
  } catch (err) {
    console.error('[Finder] Analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
