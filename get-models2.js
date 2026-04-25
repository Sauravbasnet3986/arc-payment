const fetch = require('node-fetch');

async function getModels() {
  try {
    const res = await fetch('https://api.featherless.ai/v1/models', {
      headers: { 'Authorization': 'Bearer rc_7760e2872776507a27ef15b674804bbdee941443e91172c0d99713f131152d2a' }
    });
    const data = await res.json();
    if (data.data) {
      const official = data.data
        .map(m => m.id)
        .filter(id => id.startsWith('deepseek-ai/') || id.startsWith('moonshotai/') || id.startsWith('THUDM/'));
      console.log('Official models:', official);
    }
  } catch (e) {
    console.error(e);
  }
}

getModels();
