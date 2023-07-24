autociv_patchApplyN("init", function (target, that, args)
{
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
        value = (gameStartSuggestionKey == '^0') ? "<1200" : value
        value = (gameStartSuggestionKey == '^1') ? "" : value
        value = (gameStartSuggestionKey == '^2') ? "TotalGames>10" : value
        value = (gameStartSuggestionKey == '^3') ? "waiting for friends" : value
        value = (gameStartSuggestionKey == '^4') ? "YouTube" : value
        value = (gameStartSuggestionKey == '^5') ? "must have: progGUI, feldmap" : value
        value = (gameStartSuggestionKey == '^5b') ? "must have: progGUI, autocivP, feldmap" : value
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
        value = (gameStartSuggestionKey2 == '^0') ? "rated" : value
        value = (gameStartSuggestionKey2 == '^1') ? "1v1 unrated" : value
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
        timeZone: timeZone,
      };
      return date.toLocaleTimeString('en-US', options);
    };

    const nextHalfHour = getNextHalfHour();


    // const gameStartTimeGMT = formatTime(nextHalfHour, 'GMT'); // same like 'Europe/London'

        // const message = `${gameStartTimeEU.split(':').slice(0, 2).join(':')} EU/Berlin, ${gameStartTimeIndian.split(':').slice(0, 2).join(':')} IST, ${gameStartTimeET.split(':').slice(0, 2).join(':')} ET, ${gameStartTimePT.split(':').slice(0, 2).join(':')} PT`; // GMT is same like europa london



    const tBerlinLondonSwedenDenmark = formatTime(nextHalfHour, 'Europe/London');

    const tGreece = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Athens');
    // const tSweden = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Stockholm');

    const Asia_Kolkata = formatTime(new Date(nextHalfHour.getTime() + (3.5 * 60 * 60 * 1000)), 'Asia/Kolkata');
    const USA_ET = formatTime(new Date(nextHalfHour.getTime() - (6 * 60 * 60 * 1000)), 'America/New_York');
    const USA_Los_Angeles = formatTime(new Date(nextHalfHour.getTime() - (9 * 60 * 60 * 1000)), 'America/Los_Angeles');

    if(true){

        // check its correct to london
        // const sweden = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Stockholm');
        // const greece = formatTime(new Date(nextHalfHour.getTime() + (2 * 60 * 60 * 1000)), 'Europe/Athens');

        // const Asia_Kolkata = formatTime(new Date(nextHalfHour.getTime() + (4.5 * 60 * 60 * 1000)), 'Asia/Kolkata');
        // const USA_ET = formatTime(new Date(nextHalfHour.getTime() - (5 * 60 * 60 * 1000)), 'America/New_York');
        // const USA_PT = formatTime(new Date(nextHalfHour.getTime() - (8 * 60 * 60 * 1000)), 'America/Los_Angeles');

    }

    let message =''
    message = `${tBerlinLondonSwedenDenmark.split(':').slice(0, 2).join(':')} EU/Berlin/London/Sweden/Denmark, ${tGreece.split(':').slice(0, 2).join(':')} EU/Greece, ${Asia_Kolkata.split(':').slice(0, 2).join(':')} Asia/Kolkata, ${USA_ET.split(':').slice(0, 2).join(':')} USA/NewYork , ${USA_Los_Angeles.split(':').slice(0, 2).join(':')} USA/LosAngeles`;

    message = message.replace(/\:00/g,'')

    // warn(message)
    return message;
    // 3:30 PM EU/Berlin time, 8:00 PM IST for Indian players, 9:30 AM ET, 6:30 AM PT, 2:30 PM GMT
  }
