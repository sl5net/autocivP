autociv_patchApplyN("init", (target, that, args) => {
    const res = target.apply(that, args);
    const [attribs] = args
    if (attribs.hasPassword)
    {
        let input = Engine.GetGUIObjectByName("clientPassword");
        input.blur()
        input.focus()
        input.buffer_position = input.caption.length;
        input.onPress = () => confirmPassword()
    }
    else if (attribs.multiplayerGameType == "host")
    {
        let input = Engine.GetGUIObjectByName("hostServerName");
        input.blur()
        input.focus()
        if(false && Engine.Config_selfNick =="seeh")
            input.caption = '♡mods: proGUI(bot?) autocivP(audio,setups) localRatings GodsEye(setups) ... ♡ YouTube LiveStreaming';

        else{
            const modEnabledmods = Engine.ConfigDB_GetValue(
				"user",
				"mod.enabledmods"
			);

      const customrating_trueFalse = Engine.ConfigDB_GetValue("user", "customrating");
      const isCustomratingEnabled = ( customrating_trueFalse === "true" )

      let text = ''
      const gameStartSuggestionKey = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey"
        );
      const gameStartSuggestionKey1 = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey1"
        );
      const gameStartSuggestionKey2 = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey2"
        );
      const gameStartSuggestionKey3 = Engine.ConfigDB_GetValue(
        "user",
        "autocivP.gamesetup.gameStart.suggestionKey3"
        );
      let gameStartSuggestion_value = ''
      // The variations 'nub' and 'nuub' are alternative spellings of 'noob' and are commonly used in online communities or forums.
      if(isCustomratingEnabled && gameStartSuggestionKey.trim().length > 0){
        let value = ''
        value = (gameStartSuggestionKey == '^1') ? "learn/teach/talk game" : value
        value = (gameStartSuggestionKey == '^2') ? "TotalGames>10" : value
        value = (gameStartSuggestionKey == '^3') ? "waiting for friends" : value
        value = (gameStartSuggestionKey == '^4') ? "YouTube" : value
        value = (gameStartSuggestionKey == '^5') ? "must have: progGUI, feldmap" : value
        value = (gameStartSuggestionKey == '^5b') ? "must have: progGUI, autocivP, feldmap" : value
        value = (gameStartSuggestionKey == '^0') ? "must have: progGUI, autocivP" : value
        value = (gameStartSuggestionKey == '^6') ? "spec. not play!" : value
        value = (gameStartSuggestionKey == '^7') ? "not seriously. only a game" : value
        value = (gameStartSuggestionKey == '^8') ? "Rules: 1. enable autocivP mods, 2. use Jitsi-Audio-Chat later" : value
        value = (gameStartSuggestionKey == '^9') ? "Rules: 1. enable autocivP, proGUI mods, 2. use Jitsi-Audio-Chat later 3. use share Resources with your friends later" : value
        value = (gameStartSuggestionKey == '^a') ? "game for drunken idiots - ping me by typing my name": value
        value = (gameStartSuggestionKey == '^b') ? "1v1 - random map, join by typing my name , wait 1min, i say hi, ... , start": value
        value = (gameStartSuggestionKey == '^c') ? "double speed": value
        value = (gameStartSuggestionKey == '^d') ? "normal random map - no Cheats": value
        value = (gameStartSuggestionKey == '^e') ? "1v1, 2v2 random map": value
        value = (gameStartSuggestionKey == '^f') ? "2xSpeed randomMap - don't EXIT": value
        value = (gameStartSuggestionKey == '^g') ? "2xSpeed CheatsNO randomMap - don't EXIT->ResignFirst thanks": value
        value = (gameStartSuggestionKey == '^h') ? "use Map 'Extinct Volcano'. it has something like timeout inside. Default is 25 Minutes": value
        value = (gameStartSuggestionKey == '^i') ? "talk and optional TG later": value
        value = (gameStartSuggestionKey == '^j') ? "can you do me a favor and test my latest mod update with me? please load new modificatoin from githup first": value

        gameStartSuggestion_value += `|${value}`
      }
      if(isCustomratingEnabled && gameStartSuggestionKey2 !== 'false' && gameStartSuggestionKey2.trim().length > 0){
        let value = ''
        value = (gameStartSuggestionKey2 == '^1') ? "1v1" : value
        value = (gameStartSuggestionKey2 == '^2') ? "2v2" : value
        value = (gameStartSuggestionKey2 == '^3') ? "3v3, 4v4" : value
        gameStartSuggestion_value += `|${value}|`
      }else{
        // autocivP.gamesetup.ratedDefault = "false"
        const isRatedDefault = ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.ratedDefault") === "true" )
        gameStartSuggestion_value += (isRatedDefault) ? '|rated|' :  '|unrated|' // is not expicited set in the options so suggest what rated default is
      }
      if(isCustomratingEnabled && gameStartSuggestionKey3.trim().length > 0){
        let value = ''
        value = (gameStartSuggestionKey3 == '^1') ? "pingMe" : value
        gameStartSuggestion_value += `${value}|`
      }

            const lenFirst = input.caption.length
            const gameStartTime = nextGameStartTime()

            const modsInGameName
              = Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.gameStart.showModsInGameName") == "true"
              ? `| ${modEnabledmods.slice(11,)} ← Mods I'm currently using`
              : ''

            if(gameStartTime)
              text = `${gameStartSuggestion_value} ${nextGameStartTime()} ${modsInGameName}`
            else
              text = `${gameStartSuggestion_value} ${modsInGameName}`
            // input.caption = nextGameStartTime()


            if ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.noUsernameInGameName") == "true" ){
              // if(g_selfNick =="seeh") //NOTE - developers
              //   warn(`109: ${text} = text`)
              text = text.replace(/^[\| ]*(.*?)[\| ]*$/, "$1"); // trim from leading of ending | delimiters
              input.caption = text // for some reason this was not inserted in a local game name setup. not sure why and not big problem. dont want to fix it 23-0724_1309-330
              // if(g_selfNick =="seeh") //NOTE - developers
              //   warn(`112: ${text} = text`)
            }else{
              text = text.replace(/^[\| ]*(.*?)[\| ]*$/, "$1"); // trim from ending | delimiters
              input.caption += text
              input.buffer_position = lenFirst
            }
            // input.caption += nextGameStartTime()
            // input.caption = nextGameStartTime()

    }

        // input.buffer_position = input.caption.length;
        input.onPress = () => confirmSetup()
    }
    return res
})

function nextGameStartTime() {


  let inNextFullMinute = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.gamesetup.gameStart.inNextFullMinute"
    );

  let showCountrysCode = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.gamesetup.gameStart.inNextFullMinuteCountrys"
    );


    // autocivP.gamesetup.gameStart.inNextFullMinuteRemove00
    const remove00 = Engine.ConfigDB_GetValue(
    "user",
    "autocivP.gamesetup.gameStart.inNextFullMinuteRemove00"
    );


  if(inNextFullMinute.length < 1 || isNaN(inNextFullMinute))
    return false

    const getNextHalfHour = (inNextFullMinute) => {
      const now = new Date();
      const minutes = now.getMinutes();



      if(!inNextFullMinute && isNaN(inNextFullMinute))
        inNextFullMinute = 30
      else inNextFullMinute = parseInt(inNextFullMinute)

      const roundedMinutes = Math.ceil(minutes / inNextFullMinute) * inNextFullMinute;
      const nextHalfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMinutes, 0);
      if (roundedMinutes === 60) {
        nextHalfHour.setHours(now.getHours() + 1);
        nextHalfHour.setMinutes(0);
      }
      return nextHalfHour;
    };

    const formatTime = (date, timeZone) => {
      const options = {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone,
      };
      return date.toLocaleTimeString('en-US', options);
    };

    const nextHalfHour = getNextHalfHour();

    // const gameStartTimeGMT = formatTime(nextHalfHour, 'GMT'); // same like 'Europe/London'

        // const message = `${gameStartTimeEU.split(':').slice(0, 2).join(':')} EU/Berlin, ${gameStartTimeIndian.split(':').slice(0, 2).join(':')} IST, ${gameStartTimeET.split(':').slice(0, 2).join(':')} ET, ${gameStartTimePT.split(':').slice(0, 2).join(':')} PT`; // GMT is same like europa london

        // nut totally sure if this source is really correct. i tried to geht help here:
        // https://stackoverflow.com/questions/76767940/es6-formattime-for-asia-kolkata-and-funplanat-moon-gives-always-the-same-result

        const Latvia = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/London');

    const tBerlinLondonSwedenDenmark = formatTime(nextHalfHour, 'Europe/London');

    // const tSweden = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Stockholm');
    const tGreece = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Athens');

    const Asia_Kolkata = formatTime(new Date(nextHalfHour.getTime() + (3.5 * 60 * 60 * 1000)), 'Asia/Kolkata');
    const USA_ET = formatTime(new Date(nextHalfHour.getTime() - (6 * 60 * 60 * 1000)), 'America/New_York');
    const USA_Los_Angeles = formatTime(new Date(nextHalfHour.getTime() - (9 * 60 * 60 * 1000)), 'America/Los_Angeles');
    const USA_Chicago = formatTime(new Date(nextHalfHour.getTime() - (7 * 60 * 60 * 1000)), 'America/Los_Angeles');

    const Mexiko = formatTime(new Date(nextHalfHour.getTime() - (8 * 60 * 60 * 1000)), 'Europe/London');

    const RioGrandeDoSulBrasilien = formatTime(new Date(nextHalfHour.getTime() - (5 * 60 * 60 * 1000)), 'Europe/London');

    if(true){

        // check its correct to london
        // const sweden = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Stockholm');
        // const greece = formatTime(new Date(nextHalfHour.getTime() + (2 * 60 * 60 * 1000)), 'Europe/Athens');

        // const Asia_Kolkata = formatTime(new Date(nextHalfHour.getTime() + (4.5 * 60 * 60 * 1000)), 'Asia/Kolkata');
        // const USA_ET = formatTime(new Date(nextHalfHour.getTime() - (5 * 60 * 60 * 1000)), 'America/New_York');
        // const USA_PT = formatTime(new Date(nextHalfHour.getTime() - (8 * 60 * 60 * 1000)), 'America/Los_Angeles');

    }

    // compare here: https://www.timeanddate.com/time/zone/usa
    let message =''

    if(!showCountrysCode || showCountrysCode === 'all')
      showCountrysCode = 'LatviaLondonAthensKolkataChicagoNewYorkLosAngelesMexikoRioGrandeDoSul';
    if(showCountrysCode.indexOf('London') > -1)
      message += ` ${tBerlinLondonSwedenDenmark.split(':').slice(0, 2).join(':')} Berlin`;
    if(showCountrysCode.indexOf('Latvia') > -1)
      message += ` ${Latvia.split(':').slice(0, 2).join(':')} Latvia`;
    if(showCountrysCode.indexOf('Athens')>-1)
      message += ` ${tGreece.split(':').slice(0, 2).join(':')} Greece`;
    if(showCountrysCode.indexOf('Kolkata')>-1)
      message += ` ${Asia_Kolkata.split(':').slice(0, 2).join(':')} KolkataAsia`;
    if(showCountrysCode.indexOf('Chicago')>-1)
      message += ` ${USA_Chicago.split(':').slice(0, 2).join(':')} Chicago`;
    if(showCountrysCode.indexOf('NewYork')>-1)
      message += ` ${USA_ET.split(':').slice(0, 2).join(':')} NewYork`;
    if(showCountrysCode.indexOf('LosAngeles')>-1)
      message += ` ${USA_Los_Angeles.split(':').slice(0, 2).join(':')} LosAngeles`;
    if(showCountrysCode.indexOf('Mexiko')>-1)
      message += ` ${Mexiko.split(':').slice(0, 2).join(':')} Mexiko`;
    if(showCountrysCode.indexOf('RioGrandeDoSul')>-1)
      message += ` ${RioGrandeDoSulBrasilien.split(':').slice(0, 2).join(':')} RioGrandeBrasil`;


    if(remove00) // autocivP.gamesetup.gameStart.inNextFullMinuteRemove00
      return message.replace(/\:00/g,'');

    // warn(message)
    return message;
    // 3:30 PM EU/Berlin time, 8:00 PM IST for Indian players, 9:30 AM ET, 6:30 AM PT, 2:30 PM GMT
  }
