const rp = require('request-promise');
const cheerio = require('cheerio');
const nba = require('nba.js').default;
const fs = require('fs');

let activePlayersMap = {};
const playersMap = {};
const teammateSets = {};

async function retrieveTeamOneYear(team, year) {
  console.log(`fetching ${team} ${year}`);
  const $ = await rp({
    uri: `http://www.espn.com/nba/team/stats/_/name/${team}/year/${year}/seasontype/2`,
    transform: body => cheerio.load(body),
  });

  const seasonTeammates = [];

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
      seasonTeammates.push(id);
    });

  teammateSets[team] = teammateSets[team] || [];
  teammateSets[team].push(seasonTeammates);
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

  fs.writeFile(
    'data/activePlayers.json',
    JSON.stringify(activePlayersMap),
    err => {
      if (err) {
        return console.log(err);
      }

      console.log('Active players file was saved!');
    },
  );

  fs.writeFile('data/playersMap.json', JSON.stringify(playersMap), err => {
    if (err) {
      return console.log(err);
    }

    console.log('Players map file was saved!');
  });

  fs.writeFile('data/teammateSets.json', JSON.stringify(teammateSets), err => {
    if (err) {
      return console.log(err);
    }

    console.log('Teammate sets file was saved!');
  });
}

main();
