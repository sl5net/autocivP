var g_linkLong = null; // init should be available during the game and not changed
var g_gameMapMapPrevious = null; // help prefent/debugging a errors, at the moment

// warn('Loaded gamesetup~!extra_commands.js'); // is not defined. but later it will be


var game = {
  // stuff that needs to be updated after the gui updates it (as it removes it before it)
  // undefined will mean it doesnt exist
  attributes: {},
  updateSettings() {
    // g_SetupWindow.controls.gameSettingsController.updateGameAttributes()
    // g_SetupWindow.controls.gameSettingsController.setNetworkGameAttributes()

    // thats a neddet trick!!! becouse sometimes the other player dont see the updates!
    // but works. btw its possible to set it to  9. dont worry , but needet trick ! 23-0816_1351-04
    /*!SECTION todo: maybe find a more pretty solution then this trick, but seems work pretty well 23-0816_1351-04*/
    const playerCount_backup = g_GameSettings.playerCount.nbPlayers
    if(playerCount_backup < 9){
      const playerCount_newTemp = playerCount_backup + 1
      try {
        g_GameSettings.playerCount.nbPlayers = playerCount_newTemp
      } catch (error) {
          // supresed error: g_Settings.PlayerDefaults[(playerIndex + 1)] is undefined
          // its a trick to make it work. becouse the other player dont see the updates sometimes if i dont do this trick
      }
      g_GameSettings.playerCount.nbPlayers = playerCount_backup
    }
  },
  get controls() {
    return g_SetupWindow.pages.GameSetupPage.gameSettingControlManager
      .gameSettingControls;
  },
  get panels() {

// setGameNameInLobby(text)
    return g_SetupWindow.pages.GameSetupPage.panels;
  },
  get panelsButtons() {
    return g_SetupWindow.pages.GameSetupPage.panelButtons;
  },
  set: {
    resources: (quantity) => {
      if (!g_IsController) return;
      let val = +quantity;
      if (quantity === "" || val === NaN)
        return selfMessage(
          "Invalid starting resources value (must be a number)."
        );

      g_GameSettings.startingResources.resources = val;
      game.updateSettings();
      sendMessage(`Starting resources set to: ${val}`);
    },
    mapcircular: (circular = true) => {
      if (!g_IsController) return;

      g_GameSettings.circularMap.value = circular;
      game.updateSettings();
      sendMessage(`Map shape set to: ${!!circular ? "circular" : "squared"}`);
    },
    population: (quantity) => {
      if (!g_IsController) return;
      let val = parseInt(quantity);
      if (!Number.isInteger(val) || val < 0)
        return selfMessage(
          "Invalid population cap value (must be a number >= 0)."
        );

      g_GameSettings.population.cap = val;
      game.updateSettings();
      sendMessage(`Population cap set to: ${val}`);
    },
    mapsize: (mapsize) => {
      if (!g_IsController) return;
      if (g_GameSettings.mapType != "random")
        return selfMessage(
          `Size can only be set for random maps ( g_GameSettings.mapType = ${g_GameSettings.mapType})`
        );
      let val = parseInt(mapsize);
      if (!Number.isInteger(val) || val < 1)
        return selfMessage("Invalid map size value (must be a number >= 1).");

      g_GameSettings.mapSize.size = val;
      game.updateSettings();
      // sendMessage(`Map size set to: ${val}`);
      sendMessageMapSizeSetTo(val)
    },
    numberOfSlots: (num) => {
      const playerCount = game.controls.PlayerCount;

      selfMessage(`gui/gamesetup/gamesetup~!extra_commands.js 76: player count ${playerCount}`);

      let itemIdx = playerCount.values.indexOf(num);
      playerCount.onSelectionChange(itemIdx);
    },
    player: {


      civ: (playerName, playerCivCode) => {

        let bugIt = false // new implementation so i will watch longer
        // bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer

        if(bugIt)
          selfMessage(`101: playerName = ${playerName}`)

        let playerPos = game.get.player.pos(playerName);
        if (playerPos === undefined || playerPos == -1) return;

        const playerCiv =
          g_SetupWindow.pages.GameSetupPage.gameSettingControlManager
            .playerSettingControlManagers[playerPos - 1].playerSettingControls
            .PlayerCiv;

        // List order can change depending of active language !!
        const dropDownCivCodes = playerCiv.dropdown.list_data;
        let civCodeIndex = dropDownCivCodes.indexOf(playerCivCode);
        if (civCodeIndex == -1) return;

        playerCiv.onSelectionChange(civCodeIndex);
      },
      observer: (playerName) => {
        let playerPos = game.get.player.pos(playerName);
        if (playerPos === undefined || playerPos == -1) return;

        Engine.AssignNetworkPlayer(playerPos, "");
      },
      play: (playerName) => {
        let playerId = game.get.player.id(playerName);
        let numberOfSlots = game.get.numberOfSlots();

        let assignedPos = new Set(); // set of assigned positions

        for (let guid in g_PlayerAssignments) {
          let playerPos = g_PlayerAssignments[guid].player;
          // return if player already assigned
          if (guid === playerId && playerPos > 0 && playerPos <= numberOfSlots)
            return;
          assignedPos.add(playerPos);
        }

        // find first available slot
        for (let pos = 1; pos <= numberOfSlots; ++pos) {
          if (assignedPos.has(pos)) continue;
          else {
            Engine.AssignNetworkPlayer(pos, playerId);
            return;
          }
        }
      },
    },
    /**
     * @param {string} text E.g : "1v1v3" "ffa" "4v4" "2v2v2v2"
     */
    helloAll: (text) => helloAll(text),
    teams: (text) => setTeams(text),
    slotName: (slotNumber, name) => {
      let values = g_GameSettings.playerName.values;
      values[slotNumber - 1] = name;
      g_GameSettings.playerName.values = values;
      game.updateSettings();
    },
  },
  get: {
    player: {
      // Returns undefined if no player with that name (no rating included)
      id: (playerName) => {
        return Object.keys(g_PlayerAssignments).find((id) => {
          let nick1 = splitRatingFromNick(g_PlayerAssignments[id].name).nick;
          let nick2 = splitRatingFromNick(playerName).nick;
          return nick1 == nick2;
        });
      },
      // Returns -1 in case of observer  and undefined if player doesn't exist
      pos: (playerName) => {
        let playerId = game.get.player.id(playerName);
        return g_PlayerAssignments[playerId]?.player;
      },
      selfName: () =>
        splitRatingFromNick(g_PlayerAssignments[Engine.GetPlayerGUID()].name)
          .nick,
      status: function (playerName) {
        switch (g_PlayerAssignments[this.id(playerName)].status) {
          case 1:
            return "ready";
          case 2:
            return "locked";
          default:
            return "blank";
        }
      },
    },
    players: {
      name: () =>
        Object.keys(g_PlayerAssignments).map(
          (id) => splitRatingFromNick(g_PlayerAssignments[id].name).nick
        ),
    },
    numberOfSlots: () => g_GameSettings.playerTeam.values.length,
  },
  is: {
    player: {
      assigned: (playerName) => game.get.player.pos(playerName) >= 0,
    },
    allReady: function () {
      for (let playerName of game.get.players.name())
        if (
          game.is.player.assigned(playerName) &&
          game.get.player.status(playerName) == "blank"
        )
          return false;
      return true;
    },
    full: function () {
      let nOfPlayersAssignedSlot = 0;
      for (let guid in g_PlayerAssignments)
        if (g_PlayerAssignments[guid].player >= 0) nOfPlayersAssignedSlot += 1;

      return g_GameSettings.playerTeam.values.length == nOfPlayersAssignedSlot;
    },
    rated: () => g_GameSettings.rating.enabled,
  },
  reset: {
    civilizations: () => {
      game.panels.resetCivsButton.onPress();
    },
    teams: () => {
      game.panels.resetTeamsButton.onPress();
    },
  },
};




// Alliedview

if (!("g_NetworkCommandsDescriptions" in global))
  global.g_NetworkCommandsDescriptions = {};

g_NetworkCommandsDescriptions = Object.assign(g_NetworkCommandsDescriptions, {
  "/help": "Shows all gamesetup chat commands",
  "/hiAll": "Say hello (configurable). set /hiAll yourWelcomeText or use /hiAll yourWelcomeText",
  "/alliedviewPlease": "Say enable Alliedview please",
  "/playToggle":
    "Toggle want to play action. If enabled observers that type play will be set added to the game",
  "/resources": "Set a specific amount of resources. Can be negative",
  "/resourcesUnlimited": "Set resources to be unlimited",
  "/population": "Set a specific amount of population for each player",
  "/mapsize":
    "Set a specific size for the map. Only for random maps. Small values (<64) might crash the game",
  "/mapcircular": "Force the map to be circular. Only for random maps",
  "/mapsquare": "Force the map to be square. Only for random maps",
  "/resetcivs": "Reset all slots civilizations to random",
  "/autociv": "Toggle autociv (will also disable spec and play actions)",
  "/ready": "Toggle your ready state",
  "/start": "Start the game",
  "/quit": "quit exit the setup of the game",
  "/exit": "quit exit the setup of the game",
  "/countdown":
    "Toggle countdown. Default is 5 seconds. For different time type /countdown time_in_seconds ",
  "/gameName":
    "Change game name that the lobby shows. (Doesn't work currently)",
  "/team":
    "Examples: '/team 3v4', '/team 2v2v2', '/team ffa', 'ffa'. If you don't specify the second number after 'v', it will default to the first number. You can also specify individual player numbers separated by commas (or all that is not a number). For example, '1,2' will assign players 1 and 2 to the same team. ",
  "/randomCivs":
    "Set random civs for all players. Can exclude some civs (needs full name) by typing ex: /randomCivs Mauryas Iberians Romans",
  "/kick": "Kick player",
  "/kickspecs": "Kick all specs",
  "/ban": "Ban player",
  "/banspecs": "Ban all specs",
  "/list": "List all the players and observers currently here",
  "/clear": "Clear the chat comments",
  "/pMainland_1v1_defaults": " for mainland, popMax, 300res, and more",
  "/p1v1Mainland_defaults":
    "/pNumber is alias to some proviles. e.g. /p1... to /pMainland_1v1... or /p4...",
  "/pMainland_2v2_defaults":
    "type pM⟦Tab⟧ for mainland, popMax, 300res, and more",
  "/pMBMainland_2v2_defaults":
    "type pMB⟦Tab⟧ to get mainland balanced popMax, 300res",
  "/pUnknown_defaults":
    "type pU⟦Tab⟧ for  map unknown, popMax, 300res, and more",
  "/pExtinct_volcano_defaults":
    "type pU⟦Tab⟧ for extinct_volcano and other defaults",
  "/pRestoreLastProfile":
    "/pRestoreLastProfile<enter> when you want restore last profile",
  "/iconsList":
    "heart sun flower ...",
  "/modsImCurrentlyUsing":
    "/modsImCurrentlyUsing or try modsImCurrentlyUsing⟦Tab⟧ for a list of all currently used mods",
});

g_NetworkCommands["/versionNr"] = (match) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  const modsObj = Engine.GetEngineInfo().mods
  var g_autocivPVersion = ''
  for (const [key, value] of Object.entries(modsObj)) {
    if (value.name.toLowerCase() == "autocivP".toLowerCase()) {
      g_autocivPVersion = value.version
      break
    }
  }

  const version0ad = Engine.GetEngineInfo().mods[0].version

  const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.focus()
  chatInput.caption = `i use autocivP Version is ${g_autocivPVersion} in 0ad ${version0ad}`
}

g_NetworkCommands["/iconsList"] = (match) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  selfMessage(transGGWP_markedStrings_I('allicons'))
  const keys = transGGWP_markedStrings_I('alliconkeys')
  selfMessage(keys)
  selfMessage('List of Emojis and Symbols visible in 0ad: https://wildfiregames.com/forum/topic/107659-list-of-emojis-and-symbols-visible-in-0ad/')
  const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.focus()
  chatInput.caption = keys
  // let label = Engine.GetGUIObjectByName("option_label[" + i + "]");
  // label.caption = option.label;
  // label.tooltip = option.tooltip;
}

g_NetworkCommands["/iconList"] = (match) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  selfMessage(transGGWP_markedStrings_I('allicons'))
  const keys = transGGWP_markedStrings_I('alliconkeys')
  selfMessage(keys)
  selfMessage('List of Emojis and Symbols visible in 0ad: https://wildfiregames.com/forum/topic/107659-list-of-emojis-and-symbols-visible-in-0ad/')
  const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.focus()
  chatInput.caption = keys
  // let label = Engine.GetGUIObjectByName("option_label[" + i + "]");
  // label.caption = option.label;
  // label.tooltip = option.tooltip;
}

g_NetworkCommands["/listIcons"] = (match) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  selfMessage(transGGWP_markedStrings_I('allicons'))
  const keys = transGGWP_markedStrings_I('alliconkeys')
  selfMessage(keys)
  selfMessage('List of Emojis and Symbols visible in 0ad: https://wildfiregames.com/forum/topic/107659-list-of-emojis-and-symbols-visible-in-0ad/')
  const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.focus()
  chatInput.caption = keys
  // let label = Engine.GetGUIObjectByName("option_label[" + i + "]");
  // label.caption = option.label;
  // label.tooltip = option.tooltip;
}

g_NetworkCommands["/help2All"] = (match) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  g_NetworkCommands["/help"](match, true);
}

g_NetworkCommands["/help"] = (match, sendIt2AllForRead = false) => { // if textAllSometing is something then its will be sendet to all team. not only for yourself
  // const sendIt2AllForRead = false; // TODO
  const g_ChatCommandColor = "200 200 255";
  // importand to change the normal \ here! otherwise it wont work .
  const matchStrForReadInGame = match.replace('\\', "∖");
    let text = translate(`Chat commands that match ${matchStrForReadInGame} if its there:`);
  let isSomethingFound = false;
  for (let command in g_NetworkCommands) {
    if(!command)continue; // idk if it helps to get it more stable 23-0624_1401-28
    let noSlashCommand = command.slice(1);

    const filter = new RegExp('' + match + '.*','gi');
    if(match && !command.match(filter)) //  let regexp = /[a-d]/gi;
      continue;

    isSomethingFound = true;
    const asc = g_autociv_SharedCommands[noSlashCommand];
    const ncd = g_NetworkCommandsDescriptions[command];
    text += "\n";
    text += sprintf(translate("%(command)s - %(description)s"), {
      command: "/" + coloredText(noSlashCommand, g_ChatCommandColor),
      description: ncd ?? asc?.description ?? "",
    });
  }

  if(isSomethingFound)
    saveLastCommand2History(`/help ${match}`);
  else
    text += ` nothing found`

  if(sendIt2AllForRead){
    sendMessage("Chat commands if you use this autoCiv Version:");
    sendMessage(text.replace(/\[.*?\]/g,''))
  }else
    selfMessage(text);

  // ConfigDB_CreateAndSaveValueA26A27("user", "autocivP.chat.lastCommand", `/help ${match}`);
};

g_NetworkCommands["/playToggle"] = () => {
  const key = "autociv.gamesetup.play.enabled";
  const enabled = Engine.ConfigDB_GetValue("user", key) == "true";
  // error: Engine.ConfigDB_CreateAndSaveValue is not a function
  ConfigDB_CreateAndSaveValue("user", key, enabled ? "false" : "true");
  selfMessage(
    `Player play autoassign slot ${enabled ? "enabled" : "disabled"}`
  );
};

g_NetworkCommands["/resources"] = (quantity) => game.set.resources(quantity);
g_NetworkCommands["/resourcesUnlimited"] = () => game.set.resources(Infinity);
g_NetworkCommands["/population"] = (population) =>
  game.set.population(population);
g_NetworkCommands["/mapsize"] = (size) => game.set.mapsize(size);
g_NetworkCommands["/mapname"] = () => selfMessage(g_GameSettings.map.map);
g_NetworkCommands["/mapcircular"] = () => game.set.mapcircular(true);
g_NetworkCommands["/mapsquare"] = () => game.set.mapcircular(false);
g_NetworkCommands["/resetcivs"] = () => game.reset.civilizations();
g_NetworkCommands["/autociv"] = () => {
  if (!g_IsController) return;
  let bot = botManager.get("autociv");
  bot.toggle();
  selfMessage(`${bot.name} ${bot.active ? "activated" : "deactivated"}.`);
};
g_NetworkCommands["/ready"] = () => {
  if (g_IsController) return;
  game.panelsButtons.readyButton.onPress();
};

g_NetworkCommands["/start"] = () => {
  if (!g_IsController) return;

  if (!game.is.allReady())
    return selfMessage("Can't start game. Some players not ready.");

  game.panelsButtons.startGameButton.onPress();
};

g_NetworkCommands["/quit"] = () => {
  if (Engine.HasXmppClient())
		Engine.LobbySetPlayerPresence("available")
  Engine.GetGUIObjectByName("cancelButton").onPress()
}
g_NetworkCommands["/exit"] = () => {
  if (Engine.HasXmppClient())
		Engine.LobbySetPlayerPresence("available")
  Engine.GetGUIObjectByName("cancelButton").onPress()
};

g_NetworkCommands["/countdown"] = (input) => {
  if (!g_IsController) return;

  let value = parseInt(input, 10);
  if (isNaN(value)) {
    g_autociv_countdown.toggle();
    return;
  }
  value = Math.max(0, value);
  g_autociv_countdown.toggle(true, value);
};

g_NetworkCommands["/gameName"] = (text) => {
  selfMessage(
    "functoin setGameNameInLobby is off for some reasons at the moment"
  );
  return false;

  setGameNameInLobby(text);
};




g_NetworkCommands["/pRestoreLastProfile"] = () => {
  const key = 'autocivP.gamesetup.lastCommandProfile'
  let lastCommandProfile = Engine.ConfigDB_GetValue("user", `${key}`);
  if(lastCommandProfile == '/pRestoreLastProfile') lastCommandProfile = '';
  selfMessage(`your last used profile was: ${lastCommandProfile}`);
	const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.caption = (lastCommandProfile) ? lastCommandProfile : '/help mainland';
};


g_NetworkCommands["/pMainland_1v1_defaults"] = (text) => {
  pMainland_1v1_defaults();
};
g_NetworkCommands["/1v1Mainland_defaults"] = (text) => {
  pMainland_1v1_defaults();
};
g_NetworkCommands["/p1v1Mainland_defaults"] = (text) => {
  pMainland_1v1_defaults();
};
g_NetworkCommands["/p1"] = (text) => {
  pMainland_1v1_defaults();
};
g_NetworkCommands["/pMainland_2v2_defaults"] = (text) => {
  pMainland_defaults(2);
};
g_NetworkCommands["/p2Mainland_defaults"] = (text) => {
  pMainland_defaults(2);
};
g_NetworkCommands["/2Mainland_defaults"] = (text) => {
  pMainland_defaults(2);
};
g_NetworkCommands["/p3Mainland_defaults"] = (text) => {
  pMainland_defaults(3);
};
g_NetworkCommands["/3Mainland_defaults"] = (text) => {
  pMainland_defaults(3);
};
g_NetworkCommands["/p4Mainland_defaults"] = (text) => {
  pMainland_defaults(4);
};
g_NetworkCommands["/4Mainland_defaults"] = (text) => {
  pMainland_defaults(4);
};
g_NetworkCommands["/pMBMainland_2v2_defaults"] = (text) => {
  pMBMainland_2v2_defaults();
};
g_NetworkCommands["/pExtinct_volcano_defaults"] = (text) => {
  pExtinct_volcano_defaults();
};
g_NetworkCommands["/pVolcano_Extinct_defaults"] = (text) => {
  pExtinct_volcano_defaults();
};
g_NetworkCommands["/pUnknown_defaults"] = (text) => {
  pUnknown();
};
g_NetworkCommands["/pPolarSeaTheWolfesMap"] = (text) => {
  pPolarSeaTheWolfesMap();
};
g_NetworkCommands["/pWolfesInPolarSea"] = (text) => {
  pPolarSeaTheWolfesMap();
};
  /*
Jitsi for Quick Team Calls
Jitsi is a great way to have quick team calls without any setup process. It can also be used as an audio chat for your 0ad-team.

Jitsi is an easy, no-setup way to have quick team calls and audio chats. Perfect for 0ad-teams.

Jitsi: Quick team calls, no setup, audio chat.

*/


// g_NetworkCommands["/jitsiBasic"] = (text) => {
//   if (g_linkLong == null) {
//     let linkidShort = Date.now().toString().substring(10);    // not open this link always. if you have it already probably
//     g_linkLong = `https://meet.jit.si/0ad${linkidShort}audio`;
//     openURL(g_linkLong);
//   }
//   let linkTeam1example = `${g_linkLong}team123`;
//   selfMessage(
//     ` recommendation: send later in your private team-game-chat a other unique link for audio chat. Example:  ${linkTeam1example}`
//   );
//   selfMessage(`${g_linkLong}`);
// };

g_NetworkCommands["/team"] = (text) => game.set.teams(text);
// g_NetworkCommands["/1v1"] = () => game.set.teams("team 1v1");
// g_NetworkCommands["/2v2"] = () => game.set.teams("team 2v2");
// g_NetworkCommands["/3v3"] = () => game.set.teams("team 3v3");
// g_NetworkCommands["/4v4"] = () => game.set.teams("team 4v4");

g_NetworkCommands["/hiAll"] = (text) => game.set.helloAll(text);
g_NetworkCommands["/alliedviewPlease"] = () => sendMessage("enable Alliedview please");


g_NetworkCommands["/randomCivs"] = function (excludedCivs) {
  if (!g_IsController) return;

  const excludeCivList = excludedCivs.trim().toLowerCase().split(/\s+/);
  let civList = new Map(
    Object.values(g_CivData)
      .map((data) => [data.Name.toLowerCase(), data.Code])
      .filter((e) => e[1] != "random")
  );

  excludeCivList.forEach((civ) => civList.delete(civ));

  civList = Array.from(civList);

  const getRandIndex = () => Math.floor(Math.random() * civList.length);

  for (let slot = 1; slot <= game.get.numberOfSlots(); ++slot) {
    const playerCivCode = civList[getRandIndex()][1];
    let civCodeIndex = Object.keys(g_CivData).indexOf(playerCivCode);
    if (civCodeIndex == -1) return;

    g_SetupWindow.pages.GameSetupPage.gameSettingControlManager.playerSettingControlManagers[
      slot - 1
    ].playerSettingControls.PlayerCiv.onSelectionChange(civCodeIndex + 1);
  }
};

function pExtinct_volcano_defaults() {
  // vulcan, vulkan, extinkt <= keywords to find it fast
  setMapTypeFilterNameBiome(
    "maps/random/extinct_volcano",
    "generic/temperate"
  );


  // warning("extinct_volcano"); // thats n

  //   #: gui/gamesetup/Pages/GameSetupPage/GameSettings/Single/Sliders/SeaLevelRiseTime.js:38
  // msgid "Sea Level Rise Time"
  // g_GameSettings.SeaLevelRiseTime = 10; // no error but no effect. extinct_volcano SeaLevelRiseTime
  // g_GameSettings.SeaLevelRiseTime.val = 10; // error but no effect. extinct_volcano SeaLevelRiseTime
  // g_GameSettings.SeaLevelRiseTime.value = 10; // error but no effect. extinct_volcano SeaLevelRiseTime
  // g_GameSettings.seaLevelRiseTime.value = 10; // error undefined but no effect. extinct_volcano SeaLevelRiseTime
  // g_GameSettings.SeaLevelRiseTime.cap = 10; // erro. extinct_volcano SeaLevelRiseTime
  setTeams("team 2v2");
  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}

function pMBMainland_2v2_defaults() {
  setMapTypeFilterNameBiome(
    "maps/random/mainland_balanced",
    "generic/temperate"
  );
  setTeams("team 2v2");
  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}



function pMainland_1v1_defaults() {
  // game.panelsButtons.startGameButton.onPress(); // works :)) for starting game without anything. maybe good when debugging.
  // game.panelsButtons.backButton.onPress(); // error: backButton is not defined
  // game.panelsButtons.cancelButton.onPress(); // error: is not a function
  // game.panelsButtons.cancelButton().press(true);  // error: is not a function
  // game.panelsButtons.cancelButton().press(true);  // error: is not a function
  // game.cancelButton.onPress(); // undefined
  // game.panelsButtons.exit not exist
  // game.exit(1);
  // return;
  setTeams("team 1v1");
  setMapTypeFilterNameBiome(
    "maps/random/mainland",
    "generic/temperate"
  );
  game.updateSettings(); // maybe needet before call mapsize
  let mapSize = 192; // 128 tiny, 192 small,  256 normal, 320 medium // game.set.mapsize(mapsize); //
  if (false) {
    // true only for testing / debugging
    mapSize = g_GameSettings.mapSize.size;
  } else {
    g_GameSettings.mapSize.size = mapSize;
    game.updateSettings();
  }

  sendMessageMapSizeSetTo(mapSize)


  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}

function pMainland_defaults(playersAtTeamNr) {
  setMapTypeFilterNameBiome(
    "maps/random/mainland",
    "generic/temperate"
  );
  // Map Type
  let mapsize = 256; // 128 tiny, 192 small,  256 normal, 320 medium
  g_GameSettings.mapSize.size = mapsize;
  game.updateSettings();
  // sendMessage(`Map size set to: ${mapsize}`);
  sendMessageMapSizeSetTo(mapsize)
  selfMessage(
    `"Select Map": often used "Mainland" or "Mainland balanced"(needs FeldFeld-Mod) . `
  );
  if (!playersAtTeamNr) setTeams("team 2v2");
  else setTeams(`team ${playersAtTeamNr}v${playersAtTeamNr}`);
  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}

function pUnknown() {
  // Map Type
  setMapTypeFilterNameBiome(
    "maps/random/mainland_unknown",
    "generic/temperate"
  );
  setTeams("team 2v2");
  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}

function pPolarSeaTheWolfesMap() {
  // Map Type
  setMapTypeFilterNameBiome(
    "maps/random/polar_sea",
    "generic/temperate"
  );
  setTeams("team 2v2");
  return setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration();
}


g_NetworkCommands["/hiall"] = (text) => {
  g_NetworkCommands["/hiAll"](text);
}
g_NetworkCommands["/hiAll"] = (text) => {
  g_NetworkCommands["/hiAll"](text);
}
g_NetworkCommands["/helloAll"] = (text) => {
  g_NetworkCommands["/hiAll"](text);
}
g_NetworkCommands["/helloRated"] = () => {
  g_NetworkCommands["/hiRated"]();

}

g_NetworkCommands["/hiRated"] = () => {
  // sendMessage('Hey :)');
  g_NetworkCommands["/modsImCurrentlyUsing"]();
}

g_NetworkCommands["/ratedDefault"] = (text) => {  // works not in lobby, works in a game config
    const key = "autocivP.gamesetup.ratedDefault";
    const val = (text) ? 'true' : 'false';
    ConfigDB_CreateAndSaveValueA26A27("user", key, val);
    selfMessage(
      `ratedDefault was set to ${val}`
    );
}

g_NetworkCommands["/popMaxDefault"] = (text) => {
    const popMaxDefault = parseInt(text);
    if(popMaxDefault < 20 || popMaxDefault > 300){
      selfMessage('number to small or to large');
      return
    }
    const key = "autocivP.TGmainland.PopMaxDefault";
    const val = popMaxDefault;
    ConfigDB_CreateAndSaveValueA26A27("user", key, val);
    selfMessage(
      `popMaxDefault was set to ${popMaxDefault}`
    );
    selfMessage(
      `when you use will run a profile probably popMaxDefault ${popMaxDefault} will be used.`
    );
}

















g_NetworkCommands["/gl"] = () =>{
  const chatInput = Engine.GetGUIObjectByName("chatInput")
  chatInput.caption = transGGWP_markedStrings_I('gl');
}
g_NetworkCommands["/hf"] = () => {
const chatInput = Engine.GetGUIObjectByName("chatInput")
chatInput.caption = transGGWP_markedStrings_I('hf');}
g_NetworkCommands["/wp"] = () => {
const chatInput = Engine.GetGUIObjectByName("chatInput")
chatInput.caption = transGGWP_markedStrings_I('wp');
}
g_NetworkCommands["/u2"] = () => {
const chatInput = Engine.GetGUIObjectByName("chatInput")
chatInput.caption = transGGWP_markedStrings_I('u2');
}
g_NetworkCommands["/gg"] = () => {
const chatInput = Engine.GetGUIObjectByName("chatInput")
chatInput.caption = transGGWP_markedStrings_I('gg');
}



// Store the original functions for backup
const originalNetworkCommands = Object.assign({}, g_NetworkCommands);

// Override the network command functions
for (const command in g_NetworkCommands) {
  const originalFunction = g_NetworkCommands[command];
  g_NetworkCommands[command] = function(text) {
    // selfMessage(`777: Command sent: >${command}< >${text}<`);
    if(command.length > 2 && command.substring(0,2) == '/p' && command != "/pRestoreLastProfile" )
    {
      // selfMessage('profile command found')
      // selfMessage(command);
      ConfigDB_CreateAndSaveValueA26A27("user", `autocivP.gamesetup.lastCommandProfile`, command);
    }

    // later some comands save implicit using saveLastCommand later. example: saveLastCommand(`/help ${match}`); it check if match really match before
    if(command != 'help')
      saveLastCommand2History(text ? `${command} ${text}` : `${command}` ); // this is needet. if you want use it int game setupt process 23-0623_1318-59

    // Call the original function
    originalFunction.call(this, text);
  };
}






/*!SECTION
"Set up teams for the game. Examples: '/team 3v4', '/team 2v2v2', '/team ffa', '/team 4v4'. If you use 'ffa', it will set up a Free-for-All game where everyone is on their own. The command automatically distributes players into teams based on the provided input. The input format is a combination of numbers and 'v' (for versus). For example, '3v4' means 3 players versus 4 players. You can specify up to 4 teams and a maximum of 8 players. If you don't specify the second number after 'v', it will default to the first number, allowing for more concise input. Additionally, you can also specify individual player numbers separated by commas. For example, '1,2' will assign players 1 and 2 to the same team.
*/

function setTeams(text) {
  if (!g_IsController) return;

  if (g_GameSettings.mapType == "scenario")
    return selfMessage("Can't set teams with map type scenario.");

  // selfMessage(`version= ${version}`); // dont work? howto get 0ad version?

  let teams = text.trim().toLowerCase();
  if ("ffa" == teams) {
    g_GameSettings.playerTeam.values = g_GameSettings.playerTeam.values.map(
      (v) => -1
    );
    game.updateSettings();
    return;
  }

  teams = text.match(/(\d+)/g);
  if (teams == null) return selfMessage("Invalid input.");

  if (text.indexOf("v") > 0 && !teams[1]) {
    // little feater. you dont need wirte always the second number. default (if its empty) the fist number
    teams[1] = teams[0]; // if is a 'v' inside and second empty use the first number also. if you want dont have a second team dont write v
    // selfMessage(`teams0= ${teams[0]}`);
    // selfMessage(`teams1= ${teams[1]}`);
  }

  // Transform string to number discarding 0 size teams
  teams = teams.map((v) => +v).filter((v) => v != 0);

  if (teams.length < 1 || teams.length > 4)
    return selfMessage("Invalid number of teams (min 1 max 4).");

  let numOfSlots = teams.reduce((v, a) => (a += v), 0);
  if (numOfSlots < 1 || numOfSlots > 8)
    return selfMessage("Invalid number of players (max 8).");

  g_GameSettings.playerCount.nbPlayers = numOfSlots;
  g_GameSettings.playerTeam.values = teams.flatMap((size, i) =>
    Array(size).fill(i)
  );
  game.updateSettings();
}

/*
HowTo create a JavaScript function in the 0ad mod autoCiv that changes the map filter? When you get
HowTo fix the error 'mapFilter is null' in the following JS-function inside file 'gamesetup~!extra_commands' inside the mod autoCiv?

Whey the following function inside 'gamesetup~!extra_commands' of autoCiv dont work and how to fix it?  function setMapFilterTo2() {     var mapFilter = Engine.GetGUIObjectByName("mapFilter");     mapFilter.selected = 2; }


Whey is it unpossible to develop a mod like autoCiv to set the mapFilter but easily possble to set resources?

The mapFilter is a more complex setting, as it requires more logic and data manipulation than simply setting resources. For example, when setting resources, you just need to assign a certain value to a certain tile. However, when setting the mapFilter, you have to create a logic that determines which tiles should be included in the filter. This requires more complex coding and data manipulation.

How to set the more complex mapFilter and which tiles should be included in the filter while developing a new verson of AutoCiv mod?
*/

// function setMapFilterTo() {
//   let mapFilter = {
//     tiles: ["grass", "dirt", "mountain", "water", "forest"],
//   };
// }

function setGameNameInLobby(text) {
  // selfMessage(
  //   "functoin setGameNameInLobby is off for some reasons at the moment"
  // );
  // return false;
  if (!g_IsController || !Engine.HasNetServer()) return;
  if (!g_SetupWindow.controls.lobbyGameRegistrationController) return;

  let oldGameName =
    g_SetupWindow.controls.lobbyGameRegistrationController.serverName;
  selfMessage(`oldGameName: ${oldGameName}`);

  text = `${text}`;
  g_SetupWindow.controls.lobbyGameRegistrationController.serverName = text;
  selfMessage(`Game name changed to: ${text}`);
  g_SetupWindow.controls.lobbyGameRegistrationController.sendImmediately();
  return true;
}
// setMapTypeFilterNameBiome("random", "default", "maps/random/mainland", "generic/temperate" );
function setMapTypeFilterNameBiome(name, biome, type = "random", filter = "default") {
  g_GameSettings.map.setType(type);
  g_SetupWindow.pages.GameSetupPage.gameSettingControlManager.gameSettingControls.MapFilter.gameSettingsController.guiData.mapFilter.filter =
    filter;
  g_GameSettings.map.selectMap(name);
  g_GameSettings.biome.setBiome(biome);

  game.updateSettings(); // thats needet? that other player see my changes?? for test you nee open 2 player!!! you only could test it if you see both player view

  return selfMessage(`map = ${name}`);
}



function setDefaultsforPopmaxAlliedviewRatingTreasuresNomadExploration(sendMessageToAll = true){ // forPopmaxAlliedviewRatingTreasuresNomadExploration
  // this function also is(should) always used when a map/profile config is changing 23-0624_1433-08

  let bugIt = false // new implementation so i will watch longer
  // bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer


  g_GameSettings.mapExploration.allied = true; // woks :)  AlliedView
  if(sendMessageToAll)sendMessage('AlliedView = true');

            // autocivP.gamesetup.ratedDefault
  const key = "autocivP.gamesetup.ratedDefault"; // in user.cfg
  const ratedDefault = Engine.ConfigDB_GetValue(
    "user",
    key
  );

  g_GameSettings.rating.enabled = (ratedDefault === 'true') ? true : false ; // no error and test in the lobby. it works
  // game.updateSettings();

    if(bugIt){
      if(ratedDefault == 'true'){
        selfMessage(`922: rated shold enabled gui/gamesetup/gamesetup~!extra_commands.js`);
      }else{
        selfMessage(`924: rated should not enabled gui/gamesetup/gamesetup~!extra_commands.js`);
      }
      selfMessage(`926: =========================================================== gui/gamesetup/gamesetup~!extra_commands.js`);
      selfMessage(`927: ratedDefault: ${ratedDefault} = ${(ratedDefault === 'true')} = enabled={${g_GameSettings.rating.enabled}} gui/gamesetup/gamesetup~!extra_commands.js`);
    }


  if(sendMessageToAll)sendMessage(`rating = ${ratedDefault}`);

  // gui/gamesetup/Pages/GameSetupPage/GameSettings/Single/Checkboxes/Treasures.js
  g_GameSettings.disableTreasures.enabled = true;
  if(sendMessageToAll)sendMessage('disableTreasures = true');
  g_GameSettings.nomad.enabled = false; // works
  if(sendMessageToAll)sendMessage('nomad = false');
  g_GameSettings.mapExploration.enabled = false; // todo: dont work
  if(sendMessageToAll)sendMessage('mapExploration = false');

  let popMaxDefault = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.TGmainland.PopMaxDefault"
  );
  if (!popMaxDefault) {
    popMaxDefault = 200;
  }
  g_GameSettings.population.cap = popMaxDefault; // works its a number option vield
  if(sendMessageToAll)sendMessage('popMaxDefault = ' + popMaxDefault);

  g_GameSettings.startingResources.resources = 300; // works ist a radio selct field
  if(sendMessageToAll)sendMessage('startingResources = ' + g_GameSettings.startingResources.resources);

  // game.updateSettings(); // this neds to disabled ! becouse some rating was not correct set

  // let resources = g_GameSettings.startingResources.resources; // works ist a radio selct field
  let populationMax = g_GameSettings.population.cap; // works its a number option vield
  // selfMessage(`pop= ${populationMax}`);
  // selfMessage(`res= ${resources}`);


  // selfMessage(`your last used profile id was: ${g_lastCommandID} 962 `);



  // const lastCommand1 = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${lastCommandID}`);
  // const lastCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${g_lastCommandID}`);
  // selfMessage(`your last used profile was: ${g_lastCommand}`);



  // const key2 = 'autocivP.gamesetup.lastCommand4Profile'
  // ConfigDB_CreateAndSaveValueA26A27("user", key2, g_lastCommandID);

  return populationMax;
}

function sendMessageMapSizeSetTo(mapSize)
{
  // sendMessage(`Map size set to: ${mapsize}`);
  const mapSizes = [
    { size: 128, label: 'tiny' },
    { size: 192, label: 'small' },
    { size: 256, label: 'normal' },
    { size: 320, label: 'medium' }
  ];

  let mapSizeLabel;
  for (const map of mapSizes) {
    if (map.size === mapSize) {
      mapSizeLabel = map.label;
      break;
    }
  }
  sendMessage(`Map size set to: ${mapSizeLabel} (${mapSize})`);
  selfMessage('BTW: Mapsize is 128 tiny, 192 small,  256 normal, 320 is medium')
}
