const { OpenAI } = require('openai');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...rest] = trimmed.split('=');
  if (key && rest.length > 0) env[key.trim()] = rest.join('=').trim();
});

async function listAll() {
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_BASE_URL });
  const models = await client.models.list();
  console.log(`Total models: ${models.data.length}\n`);

  // Filter for qwen models
  const qwen = models.data.filter(m => m.id.toLowerCase().includes('qwen'));
  console.log('=== Qwen models ===');
  qwen.forEach(m => console.log(' ', m.id));

  // Also look for Chinese-related
  console.log('\n=== Chinese/zh models ===');
  const zh = models.data.filter(m => m.id.toLowerCase().includes('chinese') || m.id.toLowerCase().includes('zh') || m.id.includes('llama') && m.id.includes('chinese'));
  zh.forEach(m => console.log(' ', m.id));
}

listAll().catch(console.error);
