var request = require('request');
var jf = require('jsonfile');

describe('Teleport Flock API', function() {

  describe('/cities', function() {

    var citySearchURL = 'https://flock.internal.teleport.org/api/cities/?search=Tallinn';

    beforeAll(function(done) {
      var self = this;

      request
        .get(citySearchURL, function(error, response, body) {
          self.error = error;
          self.response = response;
          self.data = JSON.parse(body);
          done();
        });
    });

    it('returns OK', function() {
      expect(this.error).toBeNull();
      expect(this.response.statusCode).toEqual(200);
    });

    it('responds with an array of cities', function() {
      expect(this.data.cities).not.toBeUndefined();
    });

    it('response contains at least one city', function() {
      expect(this.data.cities.length).not.toBe(0);
    });

  });

  describe('/search', function(done) {

    var flockSearchURL = 'https://flock.internal.teleport.org/api/search/';

    beforeAll(function(done) {
      var self = this;

      jf.readFile('test/request.json', function(err, obj) {
        request({
          url: 'https://flock.internal.teleport.org/api/search/',
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(obj)
        }, function requestDone(error, response, body) {
          self.error = error;
          self.response = response;
          self.data = JSON.parse(body);
          done();
        });
      });
    });

    it('returns OK', function() {
      expect(this.error).toBeNull();
      expect(this.response.statusCode).toBeLessThan(300);
      expect(this.response.statusCode).toBeGreaterThan(199);
    });

    it('responds with an array of results', function() {
      expect(this.data.results).not.toBeUndefined();
    });

    it('results contain at least three matches', function() {
      expect(this.data.results.length).toBeGreaterThan(2);
    });

    it('top three matches contain city data', function() {
      for (var i = 0; i++; i < 3) {
        expect(this.data.results[i].city).not.toBeUndefined();
        expect(this.data.results[i].city.name).not.toBeUndefined();
      }
    });

    it('top match contains total cost data', function() {
      expect(this.data.results[0].total_cost_usd).not.toBeUndefined();
    });

    it('top match contains average travel time data', function() {
      expect(this.data.results[0].average_time_h_per_traveling_person).not.toBeUndefined();
    });

  });

});
