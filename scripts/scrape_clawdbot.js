#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load creds
const envContent = fs.readFileSync('/home/ubuntu/clawd/.env.twitter', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line.startsWith('#') || !line.includes('=')) return;
  const [key, ...vals] = line.split('=');
  env[key.trim()] = vals.join('=').trim();
});

const authToken = env.TWITTER_AUTH_TOKEN;
const ct0 = env.TWITTER_CT0;

const features = {
  "hidden_profile_subscriptions_enabled": true,
  "responsive_web_graphql_exclude_directive_enabled": true,
  "verified_phone_label_enabled": false,
  "responsive_web_graphql_timeline_navigation_enabled": true,
  "responsive_web_graphql_skip_user_profile_image_extensions_enabled": false,
  "highlights_tweets_tab_ui_enabled": true,
  "responsive_web_twitter_article_notes_tab_enabled": true,
  "subscriptions_verification_info_verified_since_enabled": true,
  "subscriptions_feature_can_gift_premium": true,
  "creator_subscriptions_tweet_preview_api_enabled": true,
  "subscriptions_verification_info_is_identity_verified_enabled": true,
  "rweb_tipjar_consumption_enabled": true,
  "rweb_video_timestamps_enabled": true,
  "responsive_web_twitter_article_data_v2_enabled": true,
  "longform_notetweets_inline_media_enabled": true,
  "longform_notetweets_rich_text_read_enabled": true,
  "responsive_web_media_download_video_enabled": false,
  "responsive_web_enhance_cards_enabled": false,
  "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": true,
  "freedom_of_speech_not_reach_fetch_enabled": true,
  "standardized_nudges_misinfo": true,
  "tweetypie_unmention_optimization_enabled": true,
  "graphql_is_translatable_rweb_tweet_is_translatable_enabled": true,
  "view_counts_everywhere_api_enabled": true,
  "communities_web_enable_tweet_community_results_fetch": true,
  "c9s_tweet_anatomy_moderator_badge_enabled": true,
  "articles_preview_enabled": true,
  "creator_subscriptions_quote_tweet_preview_enabled": true,
  "tweet_awards_web_tipping_enabled": true,
  "longform_notetweets_consumption_enabled": true,
  "responsive_web_twitter_article_tweet_consumption_enabled": true,
  "responsive_web_edit_tweet_api_enabled": true
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
        'Cookie': `auth_token=${authToken}; ct0=${ct0}`,
        'x-csrf-token': ct0,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch (e) { reject(new Error('Parse error: ' + data.slice(0, 200))); }
      });
    }).on('error', reject);
  });
}

async function getUser(screenName) {
  const variables = { screen_name: screenName };
  const url = `https://api.twitter.com/graphql/Yka-W8dz7RaEuQNkroPkYw/UserByScreenName?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;
  const json = await fetchJSON(url);
  return json.data?.user?.result;
}

async function getTweets(userId) {
  const variables = {
    userId: userId,
    count: 20,
    includePromotedContent: false,
    withQuickPromoteEligibilityTweetFields: true,
    withVoice: true,
    withV2Timeline: true
  };
  const url = `https://api.twitter.com/graphql/V7H0Ap3_Hh2FyS75OCDO3Q/UserTweets?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;
  const json = await fetchJSON(url);
  return json;
}

function extractTweets(timeline) {
  const tweets = [];
  try {
    const instructions = timeline.data?.user?.result?.timeline_v2?.timeline?.instructions || [];
    for (const inst of instructions) {
      if (inst.type === 'TimelineAddEntries') {
        for (const entry of inst.entries || []) {
          const tweet = entry.content?.itemContent?.tweet_results?.result;
          if (tweet?.legacy) {
            tweets.push({
              id: tweet.legacy.id_str,
              text: tweet.legacy.full_text,
              created_at: tweet.legacy.created_at,
              retweets: tweet.legacy.retweet_count,
              likes: tweet.legacy.favorite_count,
              replies: tweet.legacy.reply_count
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Extract error:', e.message);
  }
  return tweets;
}

async function main() {
  console.log('Scraping @clawdbotatg...\n');
  
  const user = await getUser('clawdbotatg');
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }
  
  const profile = {
    id: user.rest_id,
    name: user.legacy.name,
    screen_name: user.legacy.screen_name,
    bio: user.legacy.description,
    followers: user.legacy.followers_count,
    following: user.legacy.friends_count,
    tweets: user.legacy.statuses_count,
    created_at: user.legacy.created_at,
    scraped_at: new Date().toISOString()
  };
  
  console.log('Profile:');
  console.log(`  @${profile.screen_name} - ${profile.name}`);
  console.log(`  Followers: ${profile.followers} | Following: ${profile.following} | Tweets: ${profile.tweets}`);
  console.log(`  Bio: ${profile.bio}\n`);
  
  const timeline = await getTweets(user.rest_id);
  const tweets = extractTweets(timeline);
  
  console.log(`Recent tweets (${tweets.length}):\n`);
  for (const t of tweets.slice(0, 10)) {
    console.log(`[${t.created_at}]`);
    console.log(`  ${t.text.slice(0, 200)}${t.text.length > 200 ? '...' : ''}`);
    console.log(`  ❤️ ${t.likes} | 🔁 ${t.retweets} | 💬 ${t.replies}\n`);
  }
  
  // Save to intel folder
  const data = { profile, tweets, scraped_at: new Date().toISOString() };
  const outPath = path.join('/home/ubuntu/clawd/intel', 'clawdbotatg.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`Saved to ${outPath}`);
}

main().catch(e => console.error('Error:', e.message));
