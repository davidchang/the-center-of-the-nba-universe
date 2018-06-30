const NBA = require('nba');

async function randomBreak() {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, Math.floor(Math.random() * 1000));
  });
}

async function getTeammatesForTeamAndSeason(teamID, season) {
  console.log('start getTeammatesForTeamAndSeason', teamID, season);
  let teamInfo = {};
  try {
    await randomBreak();
    teamInfo = await NBA.stats.commonTeamRoster({
      TeamID: teamID,
      Season: season,
    });
  } catch (e) {
    console.log('failed for ', teamID, season, e);
  }

  console.log('end getTeammatesForTeamAndSeason', teamID, season);

  return (teamInfo.commonTeamRoster || []).map(({ playerId }) => playerId);
}

async function getTeammatesListForSeason(season) {
  const promises = NBA.teams.map(({ teamId }) =>
    getTeammatesForTeamAndSeason(teamId, season),
  );

  await Promise.all(promises);
  console.log('done');
}

getTeammatesListForSeason('2017-18');
