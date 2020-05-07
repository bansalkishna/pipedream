const twitter = require('https://github.com/PipedreamHQ/pipedream/components/twitter/twitter.app.js')
const moment = require('moment')
const querystring = require('querystring')
 
module.exports = {
  name: "user-tweets", 
  version: "0.0.1",
  props: { 
    db: "$.service.db",
    twitter,
    from: { propDefinition: [twitter, "from"] }, 
    q: { propDefinition: [twitter, "keyword_filter"] },
    result_type: { propDefinition: [twitter, "result_type"] },
    includeRetweets: { propDefinition: [twitter, "includeRetweets"] },
    includeReplies: { propDefinition: [twitter, "includeReplies"] },
    enrichTweets: { propDefinition: [twitter, "enrichTweets"] },
    lang: { propDefinition: [twitter, "lang"] },
    locale: { propDefinition: [twitter, "locale"] },
    geocode: { propDefinition: [twitter, "geocode"] },
    count: { propDefinition: [twitter, "count"] },
    maxRequests: { propDefinition: [twitter, "maxRequests"] },
    timer: {
      type: "$.interface.timer",
      default: {
        intervalSeconds: 60 * 15,
      },
    },
  },
  methods: {},
  async run(event) {
    const from = `from:${this.from.replace('@','')}`
    const since_id = this.db.get("since_id")
    const { lang, locale, geocode, result_type, enrichTweets, includeReplies, includeRetweets, maxRequests, count } = this
    let q = from, max_id, limitFirstPage
    
    // join "from" filter and search keywords
    if (this.q) {
      q += ` ${this.q}`
    }
    
    if (!since_id) {
      limitFirstPage = true
    } else {
      limitFirstPage = false
    }

    // run paginated search
    const tweets = await this.twitter.paginatedSearch({ 
      q, 
      since_id, 
      lang, 
      locale, 
      geocode, 
      result_type, 
      enrichTweets, 
      includeReplies, 
      includeRetweets, 
      maxRequests,
      count,
      limitFirstPage,
    })

    // emit array of tweet objects
    if(tweets.length > 0) {
      tweets.sort(function(a, b){return a.id - b.id})

      tweets.forEach(tweet => {
        this.$emit(tweet, {
          ts: moment(tweet.created_at, 'ddd MMM DD HH:mm:ss Z YYYY').valueOf(),
          summary: tweet.full_text || tweet.text,
          id: tweet.id_str,
        })

        if (!max_id || tweet.id_str > max_id) {
          max_id = tweet.id_str
        }
      })
    }
    if (max_id) {
      this.db.set("since_id", max_id)
    }
  },
}