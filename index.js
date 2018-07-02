const nba = require('nba.js').default;

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

  return teamInfo.league.standard.players
    .map(({ personId }) => personId)
    .reduce((acc, cur) => {
      // there are a bunch of dupes for some reason
      if (acc.includes(cur)) {
        return acc;
      }
      return [...acc, cur];
    }, []);
}

async function getTeamRostersForYear(year) {
  const teams = await nba.data.teams({ year });

  const filteredTeams = teams.league.standard
    .filter(team => team.isNBAFranchise)
    .map(({ urlName }) => urlName);

  return await Promise.all(
    filteredTeams.map(team => getTeamRosterForYear(team, year)),
  );
}

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

  const score = Object.entries(parsedResults).reduce((acc, [depth, count]) => {
    if (+depth === 0) {
      return acc;
    }

    return acc + count / (+depth * +depth);
  }, 0);

  return { score, results: parsedResults };
}

async function doEverything() {
  const ACTIVE_SEASON = 2017;
  const mostRecentSeason = await getTeamRostersForYear(ACTIVE_SEASON);
  const activePlayersSet = mostRecentSeason.reduce((acc, cur) => [
    ...acc,
    ...cur,
  ]);

  let yearToQuery = ACTIVE_SEASON - 1;

  const teamRosters = [];

  // works for 2015, everything before that actually 404s
  while (yearToQuery >= 2015) {
    console.log('yearToQuery', yearToQuery);
    const season = await getTeamRostersForYear(yearToQuery);
    const seasonPlayers = season.reduce((acc, cur) => [...acc, ...cur]);

    if (seasonPlayers.every(player => !activePlayersSet.includes(player))) {
      break;
    }

    teamRosters.push(
      season.map(team =>
        team.filter(player => activePlayersSet.includes(player)),
      ),
    );
    yearToQuery--;
  }

  const g = createGraph([mostRecentSeason, ...teamRosters]);

  const playersWithScores = activePlayersSet.map(player => {
    const bfsResults = runBFS(g, player);

    const { score, results } = calculateBFSResultsScore(
      activePlayersSet,
      bfsResults,
    );
    return [player, score, results];
  });

  console.log(
    playersWithScores.sort(function(a, b) {
      return a[1] - b[1];
    }),
  );
}

doEverything();
