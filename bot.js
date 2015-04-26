var request = require('request');
var async = require('async');
var colors = require('colors');
var Twit = require('twit');
var format = require('string-format');
var jf = require('jsonfile');

var debug = false;
var tweetTemplate = 'Best match for a meeting: {best}. Travel time/person: \
{time}h, tickets: {cost} USD. More info at {link}';

var secrets = {
  consumer_key:         process.env.CONSUMER_KEY,
  consumer_secret:      process.env.CONSUMER_SECRET,
  access_token:         process.env.ACCESS_TOKEN,
  access_token_secret:  process.env.ACCESS_TOKEN_SECRET
};

var T = new Twit(secrets);

function log(message) {
  var d = new Date();
  var timestamp = '[' + d.toISOString() + ']';

  console.log(timestamp.green, message);
}

function error(message) {
  var d = new Date();
  var timestamp = '[' + d.toISOString() + ']';

  console.error(timestamp.red, message);
}

function startBotting() {
  log('Flockbot started! Listening to incoming tweets...');
  // Start the user stream.
  // New tweets are pushed from the Twitter API in real-time.
  var stream = T.stream('user');

  stream.on('tweet', receiveTweet);
  stream.on('error', function streamError(error) {
    error('Error: ' + error);
  });
}

function receiveTweet(message) {
  var tweetPattern = /(@flockusupscotty)\s+(([\w\s]+:\s?\d+[,]?)+)/i;
  var tweetMatchesPattern = tweetPattern.exec(message.text);

  if (tweetMatchesPattern) {
    log('Processing tweet from @' + message.user.screen_name +
      ': ' + message.text.blue);

    // Start the tweet processing pipeline and run the matching tweet through
    // the stages sequentially.
    // TODO: Use the Stream API instead of async
    async.waterfall([
      function startProcessingTweet(callback) {
        callback(null, tweetMatchesPattern[2]);
      },
      processQuery,
      fetchCities,
      fetchFlockLocations,
      formatTweet
    ], function doneProcessingTweet(err, tweet) {
      if (err) {
        error(err);
        replyTo({
          username: message.user.screen_name,
          status_id: message.id
        }, err);
      } else {
        replyTo({
          username: message.user.screen_name,
          status_id: message.id
        }, tweet);
      }
    });
  } else {
    log('Ignoring @' + message.user.screen_name + ': ' + message.text);
  }
}

// Break up the query string
function processQuery(queryString, callback) {
  log('Parsing the query');
  var teams = [];
  var locations = queryString.split(', ');
  locations.forEach(function parseGroup(location) {
    var city = location.split(':')[0].trim();
    var people = location.split(':')[1].trim();
    teams.push({
      city: city,
      people: parseInt(people)
    });
  });
  if (callback) {
    callback(null, teams);
  }
  return teams;
}

function fetchCities(teams, callback) {
  log('Fetching city information from the Flock API');

  var citySearchAPI = 'https://flock.internal.teleport.org/api/cities/?search=';
  var endpoints = [];
  teams.forEach(function (team) {
    endpoints.push(citySearchAPI + team.city);
  });

  // Use async to collect the GET requests for city data into a results array
  // TODO: something, something Node.js Streams
  async.mapSeries(endpoints, request.get, function(err, results) {
    var lookupError;
    results.forEach(function (result, index) {
      var jsonResult = JSON.parse(result.body);
      var cityMatch = jsonResult.cities[0];
      if (cityMatch) {
        teams[index].cityData = cityMatch;
      } else {
        lookupError = 'One or more cities was not found! Please try Flock directly at https://flock.teleport.org';
      }
    });
    callback(lookupError, teams);
  });
}

function fetchFlockLocations(teams, callback) {
  log('Fetching best meeting place from the Flock API');

  var options = {
    people_groups: []
  };

  teams.forEach(function buildRequestBody(team) {
    if (team.cityData) {
      options.people_groups.push({
        number_of_people: team.people,
        source_city_geoname_id: team.cityData.geoname_id,
        source_city: team.cityData
      });
    }
  });

  request({
    url: 'https://flock.internal.teleport.org/api/search/',
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(options)
  }, function requestDone(error, response, body) {
    if (error) {
      error(error);
    } else {
      callback(null, JSON.parse(body));
    }
  });
}

function formatTweet(data, callback) {
  log('Formatting tweet');

  best = data.results[0];
  second = data.results[1];
  third = data.results[2];

  var tweet = format(tweetTemplate, {
    best: best.city.name,
    time: Math.round(best.averageTimePerTravelingPersonH).toString(),
    cost: Math.round(best.totalCostUsd).toString(),
    second: second.city.name,
    third: third.city.name,
    link: 'https://flock.teleport.org/#!/' + data.id
  });

  if (callback) {
    callback(null, tweet);
  }

  return tweet;
}

function replyTo(data, tweetContent) {
  log('Tweeting a reply to @' + data.username);
  var requestBody = {
    status: '@' + data.username + ' ' + tweetContent,
    in_reply_to_status_id: data.status_id
  };

  log(('@' + data.username + ' ' + tweetContent).blue);
  if (!debug) {
    T.post('statuses/update', requestBody, function postTweet(err, data, response) {
      if (err) {
        error(err);
      }
    });
  }
}

function testBot() {
  log('Starting test run');
  var message = jf.readFile('message.json', function (err, obj) {
    receiveTweet(obj);
  });
}

var args = process.argv.slice(2);
if (args[0] === 'test') {
  debug = true;
  testBot();
} else {
  startBotting();
}
