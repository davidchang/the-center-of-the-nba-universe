const nba = require('nba.js').default;

async function getTeammatesForTeamAndSeason(teamName, year) {
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

async function getAllTeammatesForYear(year) {
  const teams = await nba.data.teams({ year });

  const filteredTeams = teams.league.standard
    .filter(team => team.isNBAFranchise)
    .map(({ urlName }) => urlName);

  return await Promise.all(
    filteredTeams.map(team => getTeammatesForTeamAndSeason(team, year)),
  );
}

async function doEverything() {
  const ACTIVE_SEASON = 2017;
  const mostRecentSeason = await getAllTeammatesForYear(ACTIVE_SEASON);
  const activePlayersSet = mostRecentSeason.reduce((acc, cur) => [
    ...acc,
    ...cur,
  ]);

  let yearToQuery = ACTIVE_SEASON - 1;

  // works for 2015, everything before that actually 404s
  while (yearToQuery >= 2015) {
    const season = await getAllTeammatesForYear(yearToQuery);
    const seasonPlayers = season.reduce((acc, cur) => [...acc, ...cur]);

    if (seasonPlayers.every(player => !activePlayersSet.includes(player))) {
      break;
    }

    console.log('yearToQuery', yearToQuery);

    yearToQuery--;
  }

  console.log(activePlayersSet.length);
}

doEverything();
