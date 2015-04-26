## What is flockbot?

Flockbot is a simple Twitter bot written using Node.js that will look up best meeting places for your team using Teleport Flock (https://flock.teleport.org). Flockbot's twitter account can be found at https://twitter.com/flockusupscotty.

To use flockbot, send a tweet to it in the following format:

    @flockusupscotty City: number of people, City: number of people, ...

Flockbot will reply shortly with the best match for your meeting, some additional details and a link to the original query at https://flock.teleport.org.

### Example

Tweet:

> @flockusupscotty Tallinn: 1, Tartu: 1

Response:

> @hkaju Best match for a meeting: Helsinki. Travel
  time/person: 1h, tickets: 247 USD. More info at
  https://flock.teleport.org/#!/6b7aace56b1b3750

### Disclaimer

This bot is strictly unofficial and is in no way affiliated to Teleport.
