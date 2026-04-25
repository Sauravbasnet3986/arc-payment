const fetch = require('node-fetch'); // or just use global fetch if Node >= 18

async function getModels() {
  try {
    const res = await fetch('https://api.featherless.ai/v1/models', {
      headers: { 'Authorization': 'Bearer rc_7760e2872776507a27ef15b674804bbdee941443e91172c0d99713f131152d2a' }
    });
    const data = await res.json();
    if (data.data) {
      const ds = data.data.filter(m => m.id.toLowerCase().includes('deepseek') || m.id.toLowerCase().includes('glm') || m.id.toLowerCase().includes('kimi')).map(m => m.id);
      console.log('Available models:', ds);
    } else {
      console.log('Error fetching models:', data);
    }
  } catch (e) {
    console.error(e);
  }
}

getModels();
