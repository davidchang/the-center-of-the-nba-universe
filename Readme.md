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

Find some graph theory library that can just run BFS for me. Make sure that the formats from the previous step works properly with whatever the graph theory library wants.

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
I knew there was an ESPN API for stuff like this, but when it looked, it seemed like the free public tier was shut down and you had to be some sort of private partner with them. I then found a few packages that use the public API endpoints that power nba.com - one was called [nba](https://www.npmjs.com/package/nba) and another [nba.js](https://www.npmjs.com/package/nba.js). There's a bunch of weird stuff about how the nba stats endpoint is super flaky - some calls go through, some will just hang indefinitely. I experienced it as well intermittently, where all my calls would succeed five times in a row, to then just hang five times in a row. I was feeling uneasy because I'm going to need to make a ton of requests (one for each team for each relevant season - about 450 times assuming 30 teams over 15 seasons) and I don't want to worry about retry logic. Apparently there's another endpoint called data which is more stable, so I started using that, but any request for a team roster prior to 2015 threw a 404.

I went ahead and wrote my code broken up into various async functions (by the way, I didn't even realize that Node had async/await support, so that was cool!), so I should be able to crawl some NBA site, store the data in some files, and then just reimplement those specific functions. The original logic should still work just the same.

```
mkdir nba-degrees-of-separation && cd $_
yarn add nba.js
```

### Get the set of all active NBA players

We're going to implement a function that gets all teams for a season, then gets all of the team rosters for that season. We'll make use of this function as we look back on past seasons too, so we will use it on the past 2017-2018 season to grab all team rosters, which we'll then be able to flatten to make up our active set.

Here's the function to get a single team roster:

```
async function getTeamRosterForYear(teamName, year) {
  let teamInfo;
  try {
    teamInfo = await nba.data.teamRoster({
      teamName,
      year,
    });
  } catch (e) {
    console.log('failed for ', teamName, year, e);
  }

  if (!teamInfo) {
    return [];
  }

  return teamInfo.league.standard.players.map(({ personId }) => personId);
}
```

And here's what we need to do to call that function for all teams:

```
async function getTeamRostersForYear(year) {
  const teams = await nba.data.teams({ year });

  const filteredTeams = teams.league.standard
    .filter(team => team.isNBAFranchise)
    .map(({ urlName }) => urlName);

  return await Promise.all(
    filteredTeams.map(team => getTeamRosterForYear(team, year)),
  );
}
```

Running for year 2017, we find that the active set ends up having a length of 505, so there will be 505 nodes in our graph.

### Construct the adjacency list
