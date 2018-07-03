## tl;dr

Ish Smith is the center of the NBA universe. There are 2 degrees of Ish Smith - 96 players have an Ish Smith Number of 1 and 443 have an Ish Smith Number of 2.

## Idea/Inspiration

I was watching a recap of this year's NBA finals and it got me curious about how the Golden State Warriors team has changed over the past 4 years, knowing that Cleveland as a team has had a lot less continuity (with a bunch of shake ups in this past year alone). This got me thinking about the six degrees of separation idea and Bacon numbers. There was a board game in the 1990's that posited that Kevin Bacon could connect anyone in Hollywood within six degrees or less - so Bacon became known as the center of the Hollywood universe (though in actuality, there are other more connected people in Hollywood... check out [Wikipedia](https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon) for more).

I thought I'd calculate the center of the NBA universe, as I'm interested in who has played with the most number of people. We could even turn it into a fun board game later. For the sake of simplicity, I'm going to limit this to only active NBA players as of the just-ended 2017–2018 regular season, and I'm going to use all of the team rosters available on nba.com (specifically, the statistics page for each team, example [here](http://www.espn.com/nba/team/stats/_/name/okc/year/2018/seasontype/2)). There is a chance that there was not actually overlap between all of the players on the roster (eg someone could start the season, then get traded for someone else, but the data would suggest they both played together). But they all played for the same team during the same season, which I'll consider good enough given that I spent a few days just trying to get data.

Special thanks to my friend Kelvin. Originally, I wasn't sure how to do this and was gonna use the Floyd-Warshall algorithm; that calculates all-pairs-shortest-paths. So I could run that algorithm and then take the average distance from each player to all other nodes; the person with the lowest average would be the center. Kelvin told me instead that I should run a Breadth First Search from each player instead, since Floyd-Warshall is meant for weighted edges, and all the weights in this problem are just 1. BFS should run slightly faster too - Kelvin casually threw some Big O notation to support the claim.

### Pseudo-code

```
Get the set of all active NBA players

Construct a map of edges from player to player (an "adjacency list")
  for each season,
    for each team,
      create edges between each set of teammates on that team

starting from each NBA player,
  run BFS
  from the results, calculate some score

the best score is the center of the universe
```

### Getting all of the Data

After jumping through a few hoops to get this data, I eventually just started scraping things off of nba.com, using Cheerio. I originally tried to use 2 npm modules ([nba](https://www.npmjs.com/package/nba) and [nba.js](https://www.npmjs.com/package/nba.js)), but both of them rely on some public NBA stats APIs, which sometimes hang unreliably. Since I wanted to look at 30 teams over nearly 20 years, I would've been making ~600 API calls and hoping that none of them would fail so that I wouldn't have to implement retry logic. nba.js had access to some other NBA data API, but anything prior to 2015 would 404, so that wouldn't work.

So I wrote a scraper.js in Node (which made those ~600 API calls), compiled the data, then saved it into JSON files. I got a little lucky in that I didn't have to handle some cases where a team relocated, like from SEA to OKC. I could query OKC's roster in 2002 and it would still work.

### Construct the adjacency list

```
function createGraph(seasons) {
  const graph = {};
  seasons.forEach(rosters => {
    rosters.forEach(team => {
      for (var i = 0; i < team.length; ++i) {
        for (var j = 0; j < team.length; ++j) {
          if (i === j) {
            continue;
          }

          graph[team[i]] = graph[team[i]] || { links: [] };
          // could have used a Set here, but wasn't sure what Node supports
          if (!graph[team[i]].links.includes(team[j])) {
            graph[team[i]].links.push(team[j]);
          }
        }
      }
    });
  });

  return graph;
}
```

### Running BFS

I expected to be able to find an npm module with a bunch of graph theory algorithms that I could just plug all of my data in to and run BFS. I spent a bit of time searching and tried one, but it seemed like BFS was broken, so I ended up ditching it. Even if it did work, it would've ended up a bit inefficient, as I really just wanted to count the number of nodes at each depth, rather than get the distance between the root node and some target node. So I accepted that I just needed to write my own algorithm, which is something you only do in school and in technical interviews. I certainly didn't write it perfectly the first time, and it took a bit of debugging, and it definitely wouldn't hurt to go through a round of code review, but that's okay. Actually, it's so rough that I'm not even going to leave the code here (it's just about 30 lines and I mutate the graph object in place every time instead of doing some deep copy).

### Calculating a score off of BFS

When I ran everything, I realized that every active player was connected to every other player within 3 degrees - with the exception of 2 players who could be connected to every other player within 2 degrees! I needed to come up with a way to calculate a score that rewarded closer connections - my solution was to add the number of connections at each level divided by the square of the depth. So the farther away the connection, the less it contributed to your overall score. Dividing by the square didn't actually make that much of a difference at the top of the results, but it seemed like it should have been there because I thought the difference between someone at level 2 and level 3 should be more than linear.

## The results

Here are the top 10 most centered players:

Player | Connectivity Score | # of players 1 away | # of players 2 away | # of players 3 away
--- | --- | --- | --- | ---
Ish Smith | 1206 | 96 | 443 | -
Anthony Tolliver | 1203 | 91 | 448 | -
Sean Kilpatrick | 215 | 111 | 407 | 21
Ersan Ilyasova | 211 | 105 | 417 | 17
Jameer Nelson | 206 | 96 | 439 | 4
Corey Brewer | 205 | 99 | 412 | 28
Brandan Wright | 204 | 96 | 425 | 18
D.J. Augustin | 200 | 89 | 444 | 6
Marco Belinelli | 199 | 92 | 414 | 33
Lance Stephenson | 198 | 90 | 422 | 27

### Thinking about the results

I didn't know much about Ish Smith besides that he had played for Oklahoma City at some point (DJ Augustin, Corey Brewer, and Ersan Ilyasova all also played for Oklahoma City at some point). I looked through his Wikipedia article and realized that he's been in the league since 2010 and has spent time on 10 different teams - Houston, Memphis, Golden State, Orlando, Milwaukee, Phoenix, Oklahoma City, Philadelphia, New Orleans, Philadelphia again, and Detroit. So I can see how he would be at the center of the universe.

Anthony Tolliver has been in the league since 2008, spending time with San Antonio, Portland, Golden State, Minnesota, Atlanta, Charlotte, Phoenix, Detroit, Sacramento, and then Detroit again (9 unique teams).

Since Lance Stephenson literally just signed on with the Lakers today or yesterday, he should be able to jump a few spots.

## Takeaways

- Getting data took much longer than I expected
- I had no idea that async/await was supported in Node - I was expecting to have to use Babel and was so pleasantly surprised when it ran just fine
- I can now appreciate async iterables, as I ended up with basic `for` loops since I couldn't use `foreach`. Async iterables will be a part of ES2018, so I shouldn't have to wait very long
- Kind of annoying that in Node, I can't use await outside of a function
- It would've been really cool to get some data visualization behind this, but I want to work on other things instead - if this is something you'd be interested in doing, hit me up!
