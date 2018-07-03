const fs = require('fs');

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
          if (!graph[team[i]].links.includes(team[j])) {
            graph[team[i]].links.push(team[j]);
          }
        }
      }
    });
  });

  return graph;
}

function runBFS(g, start) {
  Object.values(g).forEach(player => {
    player.visited = false;
    delete player.depth;
  });

  let listToExplore = [start];
  let nextListToExplore = [];
  let depth = 0;

  while (listToExplore.length) {
    listToExplore.forEach(curNode => {
      if (g[curNode].visited) {
        return;
      }

      g[curNode].visited = true;
      g[curNode].depth = depth;
      (g[curNode].links || []).forEach(curLink => {
        if (!nextListToExplore.includes(curLink) && !g[curLink].visited) {
          nextListToExplore.push(curLink);
        }
      });
    });

    listToExplore = [...nextListToExplore];
    nextListToExplore = [];
    depth++;
  }

  return g;
}

function calculateBFSResultsScore(activePlayersSet, bfsResults) {
  const parsedResults = Object.keys(bfsResults).reduce((acc, playerID) => {
    if (!activePlayersSet.includes(playerID)) {
      return acc;
    }

    const depth = bfsResults[playerID].depth;
    acc[depth] = acc[depth] || 0;
    acc[depth]++;
    return acc;
  }, {});

  // adding 100 * (4-length) because we need to make sure to reward players with
  // fewer overall connections
  const score =
    Object.entries(parsedResults).reduce((acc, [depth, count]) => {
      if (+depth === 0) {
        return acc;
      }

      return acc + count / (+depth * +depth);
    }, 0) +
    1000 * (4 - Object.keys(parsedResults).length);

  return { score, results: parsedResults };
}

async function doEverything() {
  const activePlayerIDs = Object.keys(
    // file structure is Object, key = playerID, value = player name
    JSON.parse(fs.readFileSync('data/activePlayers.json')),
  );

  // file structure is Object, key = playerID, value = player name
  const playersMap = JSON.parse(fs.readFileSync('data/activePlayers.json'));

  // file structure is Object, key = team name, value = array of arrays of
  // playerIDs, representing the team roster for a year
  const data = JSON.parse(fs.readFileSync('data/teammateSets.json'));
  const g = createGraph(Object.values(data));

  const playersWithScores = activePlayerIDs.map(player => {
    const bfsResults = runBFS(g, player);

    const { score, results } = calculateBFSResultsScore(
      activePlayerIDs,
      bfsResults,
    );
    return [playersMap[player], score, results];
  });

  console.log(
    // higher scores will come first
    playersWithScores.sort(function(a, b) {
      return b[1] - a[1];
    }),
  );

  fs.writeFile('data/results.json', JSON.stringify(playersWithScores), err => {
    if (err) {
      return console.log(err);
    }

    console.log('Players with BFS scores file was saved!');
  });
}

doEverything();
