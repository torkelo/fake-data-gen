var _ = require('underscore'); var moment = require('moment');

function liveFeedToLogstash() {
  console.log('Starting Elasticsearch Data Sender');

  var restify = require('restify');
  var client = restify.createJsonClient({ url: 'http://localhost:9200' });
  var data = {
    derivative: 0,
  };

  // set template
  console.log('Updating metrics mapping template');

  client.put('/_template/metrics', {
    "template" : "metrics-*",
    "settings" : { "number_of_shards" : 1, "number_of_replicas": 0 },
    "mappings" : {
      "metric" : {
        "_all" : {"enabled" : false},
        "_source" : {"enabled" : false },

        "properties": {
          "@value":     { type: 'double', },
          "@timestamp": {type: 'date', "format": "epoch_millis" },
          "@location": {
            "type": "geo_point",
          }
        },

        "dynamic_templates": [
          {
            "strings": {
              "match_mapping_type": "string",
              "mapping": {
                "type": "keyword",
                "index" : "not_analyzed",
                "omit_norms" : true,
              }
            }
          }
        ]
      }
    }
  }, function(err) {
    console.log('template mapping res:', err);
  });


  function randomWalk(name, tags, start, variation) {
    if (!data[name]) {
      data[name] = start;
    }

    data[name] += (Math.random() * variation) - (variation / 2);

    var message = {
      "@metric": name,
      "@timestamp": new Date().getTime(),
      "@value": data[name],
      "@tags": tags,
      "@location": generateRandomPoint({lat: Math.random() * 50, lon: Math.random() * 50}, 100)
    };

    _.each(tags, function(value, key) {
      message['@' + key] = value;
    });

    client.post('/metrics-' + moment().format('YYYY.MM.DD') + '/metric', message, function(err) {
      if (err) {
        console.log('Metric write error', err);
      }
    });
  }

  function generateRandomPoint(center, radius) {
    var x0 = center.lon;
    var y0 = center.lat;
    // Convert Radius from meters to degrees.
    var rd = radius/111300;

    var u = Math.random();
    var v = Math.random();

    var w = rd * Math.sqrt(u);
    var t = 2 * Math.PI * v;
    var x = w * Math.cos(t);
    var y = w * Math.sin(t);

    var xp = x/Math.cos(y0);

    // Resulting point.
    return (y+y0) + ', ' + (xp+x0);
  }

  function derivativeTest() {
    data.derivative += 100;

    var message = {
      "@metric": 'derivative',
      "@timestamp": new Date().getTime(),
      "@value": data.derivative,
    };

    client.post('/metrics-' + moment().format('YYYY.MM.DD') + '/metric', message, function(err) {
      if (err) {
        console.log('Metric write error', err);
      }
    });
  }

  function writeLogEntry() {
    var message = {
      "@message": 'Deployed website',
      "@timestamp": new Date().getTime(),
      "tags": ['deploy', 'website-01'],
      "description": "Torkel deployed website",
      "coordinates": {'latitude':  12, 'longitude': 121, level: {depth: 3, coolnes: 'very'}},
      "long": "asdsaa asdas dasdas dasdasdas asdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa asdasdasdasdasdasdas asd",
      "unescaped-content": "breaking <br /> the <br /> row",
    };

    console.log('Writing elastic log entry');
    client.post('/logs-' + moment().format('YYYY.MM.DD') + '/log', message, function(err) {
      if (err) {
        console.log('Log write error', err);
      }
    });

    setTimeout(writeLogEntry, Math.random() * 900000);
  }

  setInterval(function() {
    randomWalk('logins.count', { source: 'backend', hostname: 'server1', number: 1 }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server2', number: 2 }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server3', number: 3 }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server/4', number: 4 }, 100, 2);
    randomWalk('logins.count', { source: 'backend', hostname: 'server-5', number: 5 }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server1', number: 1 }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server 20', number: 20 }, 100, 2);
    randomWalk('logins.count', { source: 'site', hostname: 'server"21', number: 21 }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server1', number: 1 }, 100, 2);
    randomWalk('cpu', { source: 'site', hostname: 'server2', number: 2 }, 100, 2);
    randomWalk('erratic', { source: 'site', hostname: 'server2', number: 2 }, 100, 20);
    derivativeTest();
  }, 10000);

  writeLogEntry();
  setTimeout(writeLogEntry, Math.random() * 900000);
}

module.exports = {
  live: liveFeedToLogstash
};
