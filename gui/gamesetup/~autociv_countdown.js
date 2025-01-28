var g_autociv_countdown = {
	"active": false,
	"default_time": parseInt(Engine.ConfigDB_GetValue("user", "autociv.gamesetup.countdown.time"), 10),
	"set_time": undefined,
	"time": undefined,
	"timeoutid": null,
	"running": false,
	"fileLines": [],
	"fileLine": 0,
    "filePath": "autociv_data/countdown_messages.txt",
    "fileRead": false,

	"readTextFile": function (filePath) {
        try {
            let fileContent = Engine.ReadFile(filePath);
            if (!fileContent) {
                warn(`Could not read the file from: ${filePath}`);
                return null
            }
            return fileContent.split("\n");
        } catch (e) {
            warn(`Error reading file: ${filePath}: ${e}`);
            return null
        }
    },

	"getMessageLineBySecond": function(second) {
		if(!this.fileRead) {
			  this.fileLines = this.readTextFile(this.filePath);
			 if(this.fileLines != null)
			 {
			  this.fileRead = true;
			   print(`Successfully read file ${this.filePath}`);
			  }
			   else
			   {
				   return "";
			   }

		 }
		  if(this.fileLines && this.fileLines.length > 0)
		  {
			 let line = this.fileLines[second % this.fileLines.length]
			 if(line)
			 {
				 return line
			 }
		  }
		  return "";
	  },



	"next": function ()
	{
		if (this.time <= 0)
		{
			// Last check before actually pressing
			if (!this.valid())
			{
				this.stopCountdown()
				return
			}

			this.stopCountdown()
			game.panelsButtons.startGameButton.onPress()
			return
		}

		try {
			// we can live without this. but its nice 25-0128_1002-10
			let popMax= g_GameSettings.population.cap

			let isRatedStr = ""
			if (g_GameSettings && g_GameSettings.rated)
				isRatedStr = g_GameSettings.rated.isRated ? " ∑Rated" : ""

			let isNomadStr = ""
			if (g_GameSettings && g_GameSettings.nomad)
				isNomadStr = g_GameSettings.nomad.enabled ? " ⇅Nomad" : ""

			let isTreasuresStr = ""
			if (g_GameSettings && g_GameSettings.disableTreasures )
				isTreasuresStr = g_GameSettings.disableTreasures.enabled  ? " ❀Treasures" : "";

			if ( this.time % 4 == 0){
				// let m = `popMax=${popMax} isRatedStr=${isRatedStr}, isNomadStr=${isNomadStr} isTreasuresStr=${isTreasuresStr} remaining ${this.time} seconds. You know already https://replay-pallas.wildfiregames.ovh/LocalRatings ? Its great for TG's`
				let m = `${this.time}: popMax=${popMax}${isRatedStr}${isNomadStr}${isTreasuresStr}`
				// print(m)
				sendMessage(m)
			}else{
				let fileMessage = this.getMessageLineBySecond(this.fileLine++);
				// print(fileMessage)
				sendMessage(`${this.time}: ${fileMessage} `)
			}
		} catch (error) {
			sendMessage(`Start in ${this.time} seconds.` )

			if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
				warn(error.message)
				print(error.message)
				warn(error.stack)
			}

		}

		this.timeoutid = setTimeout(() =>
		{
			this.time -= 1
			this.next()
		}, 1000)
	},
	"startCountdown": function (time)
	{
		this.stopCountdown()
		this.set_time = time
		this.time = time
		this.running = true
		if (this.valid())
			this.next()
	},
	"resetCountdown": function ()
	{
		this.startCountdown(this.set_time)
	},
	"stopCountdown": function ()
	{
		this.running = false
		clearTimeout(this.timeoutid)
	},
	"isEveryoneReady": () => g_SetupWindow.pages.GameSetupPage.panelButtons.startGameButton.isEveryoneReady(),
	"valid": function ()
	{
		return game.is.full() && game.is.allReady() && this.isEveryoneReady() &&
			(game.get.numberOfSlots() == 2 ? !game.is.rated() : true)
	},
	"gameUpdate": function ()
	{
		if (!this.active)
			return

		if (!this.valid())
			this.stopCountdown()
		else
			this.resetCountdown()
	},
	"gameUpdateSoft": function ()
	{
		if (!this.active)
			return

		if (!this.valid())
			this.stopCountdown()
		else if (!this.running)
			this.resetCountdown()
	},
	"toggle": function (active = !this.active, time = this.default_time)
	{
		this.active = active
		if (active)
		{
			selfMessage(`Countdown set to ${time} seconds.`)
			this.startCountdown(time)
		}
		else
		{
			selfMessage(`Countdown disabled.`)
			this.stopCountdown()
		}
	},
	"init": function ()
	{
		if (g_IsController && Engine.ConfigDB_GetValue("user", "autociv.gamesetup.countdown.enabled") == "true")
			g_autociv_countdown.toggle(true)
	},
}

autociv_patchApplyN("init", function (target, that, args)
{
	target.apply(that, args);
	const ctrl = g_SetupWindow.controls
	ctrl.playerAssignmentsController.registerClientLeaveHandler(() => g_autociv_countdown.gameUpdateSoft())
	ctrl.readyController.registerResetReadyHandler(() => g_autociv_countdown.gameUpdateSoft())
	ctrl.netMessages.registerNetMessageHandler("ready", () => g_autociv_countdown.gameUpdateSoft())
})
