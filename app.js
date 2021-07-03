#!/usr/bin/env node

"use strict";

var config = require('./config.js');

var shuffle  = require("shuffle-array");
var linewrap = require("linewrap");
var Twitter  = require("twitter");
var moment = require("moment");
const program = require("commander");

let query = "";

const client = new Twitter({
  consumer_key: config.consumer_key,
  consumer_secret: config.consumer_secret,
  access_token_key: config.access_token_key,
  access_token_secret: config.access_token_secret,
});

let last_tweet = "";

const wrap = linewrap(39, {lineBreak: "\n" /*, other options */});

const commonQueryParams = " -filter:retweets -filter:images -filter:links";

const updateTweets = () => {

  var _options = {
    q: "#" + query + commonQueryParams,
    lang: "en",
    // result_type: "recent",
    tweet_mode: "extended",
    count: 50,
    max_id: last_tweet,
  };

  client.get("search/tweets", _options, function(error, tweets) {
    if (tweets.statuses) {
      var _statuses = tweets.statuses;
      last_tweet = _statuses[_statuses.length-1].id_str;
      shuffle(_statuses);
      popTweet(_statuses);
    }
  });
};

const popTweet = (_statuses) => {
  var _status = _statuses.pop();
  printStatus(_status);

  if (_statuses.length > 0) {
    newLine();
    setTimeout(popTweet, 5000, _statuses);

  } else {
    setTimeout(updateTweets, 5000);
  }
};

const newLine = () => {
  console.log("");
  console.log("---------------------------------------");
  console.log("");
};

const printStatus = (_status) => {
  var _text = "";
  if (_status.full_text) {
    _text = _status.full_text;
  } else {
    _text = _status.text;
  }

  // Replace non-ascii characters
  _text = _text.replace("’", "\"");
  _text = _text.replace("“", "\"");
  _text = _text.replace("”", "\"");
  _text = _text.replace("&amp;", "&");

  // Strip unicode characters
  _text = _text.replace(/[^\x00-\x7F]/g, "");

  // Hilight hashtags
  _text = _text.replace(/(^|\s)(#[a-z\d-_]+)/ig, "$1\x1B[34m$2\x1B[0;36m");

  // Hilight usernames
  _text = _text.replace(/(^|\s)(@[a-z\d-_]+)/ig, "$1\x1B[1;33m$2\x1B[0;36m");

  // Print author"s name and time
  process.stdout.write(("\x1B[7;31m@" + _status.user.screen_name + "\x1B[0;31m "));
  console.log(moment(_status.created_at, "dd MMM DD HH:mm:ss ZZ YYYY", "en").fromNow());
  process.stdout.write(("\x1B[0;36m"));

  // Print the tweet itself
  console.log(wrap(_text));
};

program
  .version("1.0.0")
  .description("Twitter client");

program
  .command("ht <hashtag> [otherTags...]")
  .description("Query hashtags (omit # symbol)")
  .action((_hashtag, _otherTags) => {
    var _query = "(";
    _query += "#" + _hashtag;
    _otherTags.forEach(function (_tag) {
      _query += " OR #" + _tag;
    });
    _query += ") ";
    query = _query;
    updateTweets();
  });

program
  .command("w <word> [otherWords...]")
  .description("Query words")
  .action((_word, _otherWords) => {
    var _query = "(";
    _query += _word;
    _otherWords.forEach(function (_oword) {
      _query += " OR " + _oword;
    });
    _query += ") ";
    query = _query;
    console.log(query);
    updateTweets();
  });

program
  .command("u <user>")
  .description("Query user (omit @ symbol)")
  .action((_user) => {
//    var _query = "(from:" + _user + " OR @" + _user + ")";
    var _query = "(from:" + _user + ")";
    query = _query;
    console.log(query);
    updateTweets();
  });


program.parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
