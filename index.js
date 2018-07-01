const nba = require('nba.js').default;
const jsgraphs = require('js-graph-algorithms');

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

function createGraph(activePlayersSet, teammatesPairs) {
  const g = new jsgraphs.Graph(activePlayersSet.length);

  teammatesPairs.forEach(season => {
    // console.log('start of season', season.length);

    season.forEach((team, index) => {
      // if (index !== 0) {
      //   return;
      // }

      // console.log('team', team);

      const playerIndices = team.map(player =>
        activePlayersSet.findIndex(el => el === player),
      );

      // console.log('playerIndices', playerIndices);

      for (var i = 0; i < playerIndices.length; ++i) {
        for (var j = i + 1; j < playerIndices.length; ++j) {
          console.log(`connecting ${playerIndices[i]} to ${playerIndices[j]}`);
          g.addEdge(playerIndices[i], playerIndices[j]);
        }
      }
    });
  });

  return g;
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

  const g = createGraph(activePlayersSet, [mostRecentSeason, ...teamRosters]);

  const bfs = new jsgraphs.BreadthFirstSearch(g, 0);
  for (var i = 1; i < 3 /*activePlayersSet.length*/; ++i) {
    if (bfs.hasPathTo(i)) {
      console.log(`path to ${i}`, bfs.pathTo(i));
    } else {
      console.log(`no path to ${i}`);
    }
  }
}

doEverything();
