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
			// let text = `♡mods: ${modEnabledmods.slice(11,)}`
            const lenFirst = input.caption.length
            let text = ` | starts: ${nextGameStartTime()} | ${modEnabledmods.slice(11,)} ← Mods I'm currently using`
            input.caption += text
            // input.caption += nextGameStartTime()
            // input.caption = nextGameStartTime()
            input.buffer_position = lenFirst
    }

        // input.buffer_position = input.caption.length;
        input.onPress = () => confirmSetup()
    }
    return res
})


function nextGameStartTime(){const getNextHalfHour = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    const nextHalfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), roundedMinutes, 0);
    if (roundedMinutes === 60) {
      nextHalfHour.setHours(now.getHours() + 1);
      nextHalfHour.setMinutes(0);
    }
    return nextHalfHour;
  };

  const formatTime = (date) => {
    const options = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: 'Europe/London',
    };
    return date.toLocaleTimeString('en-US', options);
  };

  const formatTimeForIndianPlayers = (date) => {
    const options = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    };
    return date.toLocaleTimeString('en-US', options);
  };

  const nextHalfHour = getNextHalfHour();
  const gameStartTimeEU = formatTime(nextHalfHour);
  const gameStartTimeIndian = formatTimeForIndianPlayers(nextHalfHour);

  const message = `${gameStartTimeEU.split(':').slice(0, 2).join(':')} EU time`;
  return message;
  }
