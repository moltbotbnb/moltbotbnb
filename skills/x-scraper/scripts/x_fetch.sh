#!/bin/bash
# X Scraper helper script
# Usage: x_fetch.sh <command> <arg> [options]
#
# Commands:
#   tweet <id>              - Get tweet by ID
#   user <username>         - Get user profile by username  
#   user_id <id>            - Get user profile by ID
#   tweets <user_id>        - Get user's tweets
#   followers <user_id>     - Get user's followers
#   search <query>          - Search tweets
#   replies <tweet_id>      - Get tweet replies
#   mentions <username>     - Get mentions of a user

set -e

# Load API URL from .env.twitter
ENV_FILE="${ENV_FILE:-/home/ubuntu/clawd/.env.twitter}"
if [[ -f "$ENV_FILE" ]]; then
    export $(grep -E '^X_SCRAPE_API=' "$ENV_FILE" | xargs)
fi

API="${X_SCRAPE_API:-https://27jiynd2e2.eu-central-1.awsapprunner.com}"

CMD="${1:-help}"
ARG="$2"
LIMIT="${3:-20}"

case "$CMD" in
    tweet)
        [[ -z "$ARG" ]] && echo "Usage: x_fetch.sh tweet <tweet_id>" && exit 1
        curl -s "$API/tweet/$ARG"
        ;;
    user)
        [[ -z "$ARG" ]] && echo "Usage: x_fetch.sh user <username>" && exit 1
        curl -s "$API/user/username/$ARG"
        ;;
    user_id)
        [[ -z "$ARG" ]] && echo "Usage: x_fetch.sh user_id <user_id>" && exit 1
        curl -s "$API/user/$ARG"
        ;;
    tweets)
        [[ -z "$ARG" ]] && echo "Usage: x_fetch.sh tweets <user_id> [limit]" && exit 1
        curl -s "$API/user/$ARG/tweets?limit=$LIMIT"
        ;;
    followers)
        [[ -z "$ARG" ]] && echo "Usage: x_fetch.sh followers <user_id> [limit]" && exit 1
        curl -s "$API/user/$ARG/followers?limit=$LIMIT"
        ;;
    search)
        [[ -z "$ARG" ]] && echo "Usage: x_fetch.sh search <query> [limit]" && exit 1
        ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$ARG'))")
        curl -s "$API/search?query=$ENCODED&limit=$LIMIT&product=Latest"
        ;;
    replies)
        [[ -z "$ARG" ]] && echo "Usage: x_fetch.sh replies <tweet_id> [limit]" && exit 1
        curl -s "$API/tweet/$ARG/replies?limit=$LIMIT"
        ;;
    mentions)
        [[ -z "$ARG" ]] && echo "Usage: x_fetch.sh mentions <username> [limit]" && exit 1
        ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('@$ARG'))")
        curl -s "$API/search?query=$ENCODED&limit=$LIMIT&product=Latest"
        ;;
    health)
        curl -s "$API/health"
        ;;
    stats)
        curl -s "$API/stats"
        ;;
    accounts)
        curl -s "$API/accounts/status"
        ;;
    help|*)
        echo "X Scraper - Twitter/X data fetching"
        echo ""
        echo "Usage: x_fetch.sh <command> <arg> [limit]"
        echo ""
        echo "Commands:"
        echo "  tweet <id>           Get tweet by ID"
        echo "  user <username>      Get user profile"
        echo "  user_id <id>         Get user by ID"
        echo "  tweets <user_id>     Get user's tweets"
        echo "  followers <user_id>  Get user's followers"
        echo "  search <query>       Search tweets"
        echo "  replies <tweet_id>   Get tweet replies"
        echo "  mentions <username>  Get mentions"
        echo "  health               API health check"
        echo "  stats                API stats"
        echo "  accounts             Account status"
        ;;
esac
