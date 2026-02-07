---
name: x-scraper
description: Scrape Twitter/X data using the AWS scraper API. Use when fetching tweets, user profiles, followers, search results, or engagement metrics from X. Endpoints include /tweet/{id}, /user/username/{handle}, /search, /user/{id}/tweets, /user/{id}/followers.
---

# X Scraper Skill

Scrape Twitter/X data via the AWS-hosted twscrape API.

## Configuration

API base URL is in `.env.twitter`:
```bash
X_SCRAPE_API=https://27jiynd2e2.eu-central-1.awsapprunner.com
```

No authentication required - accounts are pre-configured on the server.

## Core Endpoints

### Get Tweet by ID
```bash
curl -s "$X_SCRAPE_API/tweet/{tweet_id}"
```

Returns: content, author, engagement (likes, retweets, replies, views), media, hashtags, mentions.

### Get User Profile
```bash
curl -s "$X_SCRAPE_API/user/username/{username}"
```

Returns: id, displayname, description, followers_count, friends_count, verified, blue status.

### Search Tweets
```bash
curl -s "$X_SCRAPE_API/search?query={query}&limit=20&product=Latest"
```

Search operators:
- `from:username` - tweets from user
- `to:username` - tweets to user
- `"exact phrase"` - phrase match
- `#hashtag` - hashtag
- `min_faves:50` - minimum likes
- `since:2024-01-01` / `until:2024-12-31` - date range

Products: `Top`, `Latest`, `Media`, `People`

### Get User Tweets
```bash
curl -s "$X_SCRAPE_API/user/{user_id}/tweets?limit=20"
```

### Get User Followers
```bash
curl -s "$X_SCRAPE_API/user/{user_id}/followers?limit=20"
```

### Get Tweet Replies
```bash
curl -s "$X_SCRAPE_API/tweet/{tweet_id}/replies?limit=20"
```

## Pagination

All list endpoints support cursor-based pagination:
```bash
curl -s "$X_SCRAPE_API/search?query=test&cursor={cursor_from_previous_response}"
```

Check `pagination.has_more` and use `pagination.cursor` for next page.

## Helper Script

Use `scripts/x_fetch.sh` for quick fetching:
```bash
./skills/x-scraper/scripts/x_fetch.sh tweet 2017545290493137114
./skills/x-scraper/scripts/x_fetch.sh user clawdbotatg
./skills/x-scraper/scripts/x_fetch.sh search "BNB Chain AI"
```

## Common Patterns

### Get competitor intel
```bash
# Get user profile
curl -s "$X_SCRAPE_API/user/username/clawdbotatg" | jq '{followers: .followers_count, tweets: .statuses_count}'

# Get their recent tweets
USER_ID=$(curl -s "$X_SCRAPE_API/user/username/clawdbotatg" | jq -r '.id')
curl -s "$X_SCRAPE_API/user/$USER_ID/tweets?limit=10" | jq '.tweets[] | {content, likes: .like_count, retweets: .retweet_count}'
```

### Monitor mentions
```bash
curl -s "$X_SCRAPE_API/search?query=@moltbotbnb&product=Latest&limit=20"
```

### Get engagement on specific tweet
```bash
curl -s "$X_SCRAPE_API/tweet/2017545290493137114" | jq '{likes: .like_count, retweets: .retweet_count, replies: .reply_count, views: .view_count}'
```

## Rate Limits

The API handles Twitter rate limits automatically with account switching. If you see errors, wait a few minutes or check `/accounts/status`.
