const rp = require('request-promise');
const cheerio = require('cheerio');
const nba = require('nba.js').default;

let activePlayersMap = {};
const playersMap = {};
const teammateSets = {};

async function retrieveTeamOneYear(team, year) {
  console.log(`fetching ${team} ${year}`);
  const $ = await rp({
    uri: `http://www.espn.com/nba/team/stats/_/name/${team}/year/${year}/seasontype/2`,
    transform: body => cheerio.load(body),
  });

  $('div.mod-table div.mod-content')
    .first()
    .find('tr td:first-child a')
    .each(function(i, elem) {
      const href = $(this)
        .prop('href')
        .split('/');

      const name = $(this).text();
      const id = href[href.length - 2];

      // modify these global states!
      playersMap[id] = name;
      teammateSets[team] = teammateSets[team] || [];
      teammateSets[team].push(id);
    });
}

async function retrieveAllTeams() {
  const teamNameMap = {
    nop: 'no',
    uta: 'utah',
  };

  const teams = await nba.data.teams({ year: 2018 });

  const filteredTeams = teams.league.standard
    .filter(team => team.isNBAFranchise)
    .map(
      team =>
        teamNameMap[team.tricode.toLowerCase()] || team.tricode.toLowerCase(),
    );

  for (let year = 2018; year > 2001; year--) {
    for (let teamIndex = 0; teamIndex < filteredTeams.length; ++teamIndex) {
      await retrieveTeamOneYear(filteredTeams[teamIndex], year);
    }

    if (year === 2018) {
      activePlayersMap = { ...playersMap };
    }
  }
}

async function main() {
  await retrieveAllTeams();

  // activePlayersMap
  // playersMap
  // teammateSets
}

main();
