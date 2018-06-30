I was watching a recap of this year's NBA finals and got curious about how the Golden State Warriors team had changed over the past 4 years, knowing that Cleveland as a team had a lot less continuity (with a bunch of shake ups even in this past year). This got me thinking about the six degrees of separation idea and Bacon numbers. Kevin Bacon was known as the most well-connected actor, the center of the Hollywood universe (though I heard someone re-crunched everything and it's actually Danny Trejo.. checking out [Wikipedia](https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon) suggests a number of different centers, none of which I actually recognize). There are other numbers, like the Armada Number (in Smash Bros Melee, the length of the chain of people who have eventually beaten Armada), the Erdos Number ("collaborations on mathematical papers with Paul Erdos"), and the Erdos-Bacon Number (the sum of Erdos and Bacon numbers, someone has a score of 3!).

I thought I'd calculate the center of the NBA universe, as I'm interested in who has played with the most number of people. For the sake of simplicity, I'm going to limit this to only active NBA players as of the just-ended 2017–2018 regular season, and I'm just going to use the end-of-season team rosters that you would see on nba.com.

Also, thanks to my friend Kelvin. Originally, I wasn't sure how to do this; the first thing that came to my mind was the Floyd-Warshall algorithm, as that calculates all-pairs-shortest-paths. So I could run that algorithm and then take the average of each player; the person with the lowest average would be the center. Kelvin told me to just run a Breadth First Search from each player instead, since Floyd-Warshall is meant for weighted edges, and all the weights in this problem are just 1. BFS should run slightly faster too - Kelvin threw some Big O notation at me and casually used the cardinality notation.

## Original Pseudo-code

```
Get the set of all active NBA players

Construct a map of edges from player to player (an "adjacency list")
  for each season with an active NBA player,
    for each team,
      create edges between each set of teammates on that team, as long as that teammate is in the set of active NBA players

Find some graph theory library that can just run BFS for me. Make sure that the formats from the previous steps work properly with whatever the graph theory library wants.

starting from each NBA player,
  run BFS. calculate some score (this score may be the depth of the traversal, or may take into account all nodes and the depths at which they occur)

the lowest score is the center of the universe
```

## Original Pseudo-code to construct the adjacency list

```
Construct a map of edges from player to player:
  for each NBA player,
    for each year that they played,
      add an edge from them to each of their teammates on that team for the year, as long as that teammate is in the set of active NBA players
```

## Getting the Data

At first, I overwhelmed myself a little by trying to process the data in the same step as just getting the data. For this use case, that's needlessly complicated. We can just take two steps - get the data first, then process it second.
I knew there was an ESPN API for stuff like this, but when it looked, it seemed like the free public tier was shut down and you had to be some sort of private partner with them. I found a package on npm called [nba](https://www.npmjs.com/package/nba), so I'm gonna use that. I'm not totally sure if everything's up-to-date, because I see some files storing all players and teams, but I'm just going to assume that it works, and it should be something I can replace later.

```
mkdir nba-degrees-of-separation && cd $_
yarn add nba
```

From the npm module's *Getting Started* section, I created an `index.js` and put this in here to test:

```
const NBA = require('nba');
const curry = NBA.findPlayer('Stephen Curry');
console.log(curry);
NBA.stats.playerInfo({ PlayerID: curry.playerId }).then(console.log);
```

### Get the set of all active NBA players

There's two ways we could do this. The first uses a synchronous function from the `nba` npm module that has a preprocessed list of players available (based on some script being run). The only thing we will do is filter out players where teamId === 0 (this seems to be the case where a player is waived by a team or ends the season in the G League).

```
function getActiveSet() {
  const playerIDMap = {};
  NBA.players.forEach((player) => {
    if (!player.teamId) {
      return;
    }

    playerIDMap[player.playerId] = player;
  });

  return playerIDMap;
}
```

That active set ends up having 492 players in it, so there will be 492 nodes in our graph.

### Construct the adjacency list
