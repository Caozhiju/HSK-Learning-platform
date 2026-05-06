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

const apiKey = env.OPENAI_API_KEY;
const baseURL = env.OPENAI_BASE_URL;
const model = env.LLM_MODEL;

console.log('=== NVIDIA Qwen3 API Test ===');
console.log(`Base URL: ${baseURL}`);
console.log(`Model: ${model}`);
console.log(`API Key: ${apiKey.slice(0, 15)}...`);
console.log('');

async function test() {
  const client = new OpenAI({ apiKey, baseURL });

  // Test 1: Simple chat
  console.log('[Test 1] Simple chat...');
  try {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 100,
      messages: [
        { role: 'user', content: '你好，请用一句话介绍你自己。' }
      ],
    });
    const reply = completion.choices[0]?.message?.content;
    console.log('  OK:', reply);
    console.log(`  Tokens: ${completion.usage?.total_tokens}`);
    console.log('');
  } catch (err) {
    console.log('  FAIL:', err.message);
    console.log('');
    return;
  }

  // Test 2: HSK rewrite prompt
  console.log('[Test 2] HSK text simplification (rewrite prompt)...');
  try {
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: '在以下文本中，被 ** ** 标记的词汇超出了 HSK 3 级的范围。请你仅使用 HSK 1-3 级的基础词汇替换这些高亮词汇，保持原句核心句意不变。请直接输出修改后的纯文本。\n\n文本：\n这个**现象**对社会**产生**了**深刻**的**影响**。'
        }
      ],
    });
    const reply = completion.choices[0]?.message?.content;
    console.log('  OK:', reply);
    console.log(`  Tokens: ${completion.usage?.total_tokens}`);
    console.log('');
  } catch (err) {
    console.log('  FAIL:', err.message);
  }

  console.log('=== All Tests Passed ===');
}

test().catch(console.error);
