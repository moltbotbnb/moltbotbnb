const { TwitterApi } = require('/home/ubuntu/clawd/node_modules/twitter-api-v2');
const { readFileSync } = require('fs');

const envContent = readFileSync('/home/ubuntu/clawd/.env.twitter', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line.startsWith('#') || !line.includes('=')) return;
  const [key, ...vals] = line.split('=');
  env[key.trim()] = vals.join('=').trim();
});

const client = new TwitterApi({
  appKey: env.TWITTER_CONSUMER_KEY,
  appSecret: env.TWITTER_CONSUMER_SECRET,
  accessToken: env.TWITTER_ACCESS_TOKEN,
  accessSecret: env.TWITTER_ACCESS_TOKEN_SECRET,
});

const tweet = process.argv[2];

(async () => {
  try {
    const result = await client.v2.tweet(tweet);
    console.log('POSTED:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
    if (e.data) console.error('DATA:', JSON.stringify(e.data, null, 2));
  }
})();
