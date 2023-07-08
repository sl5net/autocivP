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
            let text = ''
			// let text = `♡mods: ${modEnabledmods.slice(11,)}`
            const lenFirst = input.caption.length
            text = ` | starts: ${nextGameStartTime()} |> ${modEnabledmods.slice(11,)} ← Mods I'm currently using`
            // input.caption = nextGameStartTime()
            input.caption += text
            input.caption += nextGameStartTime()
            // input.caption = nextGameStartTime()
            input.buffer_position = lenFirst
    }

        // input.buffer_position = input.caption.length;
        input.onPress = () => confirmSetup()
    }
    return res
})

function nextGameStartTime() {
    const getNextHalfHour = () => {
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
    const gameStartTimeEU = formatTime(nextHalfHour, 'Europe/London');
    const gameStartTimeIndian = formatTime(new Date(nextHalfHour.getTime() + (5 * 60 * 60 * 1000)), 'Asia/Kolkata');
    const gameStartTimeET = formatTime(new Date(nextHalfHour.getTime() - (4 * 60 * 60 * 1000)), 'America/New_York');
    const gameStartTimePT = formatTime(new Date(nextHalfHour.getTime() - (7 * 60 * 60 * 1000)), 'America/Los_Angeles');
    const gameStartTimeGMT = formatTime(nextHalfHour, 'GMT');
    const gameStartTimeCET = formatTime(new Date(nextHalfHour.getTime() + (1 * 60 * 60 * 1000)), 'Europe/Berlin');


    const message = `${gameStartTimeEU.split(':').slice(0, 2).join(':')} EU/Berlin, ${gameStartTimeIndian.split(':').slice(0, 2).join(':')} IST, ${gameStartTimeET.split(':').slice(0, 2).join(':')} ET, ${gameStartTimePT.split(':').slice(0, 2).join(':')} PT, ${gameStartTimeGMT.split(':').slice(0, 2).join(':')} GMT`;
    return message;
    // 3:30 PM EU/Berlin time, 8:00 PM IST for Indian players, 9:30 AM ET, 6:30 AM PT, 2:30 PM GMT
  }
