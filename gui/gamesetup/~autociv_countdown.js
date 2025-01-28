var g_autociv_countdown = {
	"active": false,
	"default_time": parseInt(Engine.ConfigDB_GetValue("user", "autociv.gamesetup.countdown.time"), 10),
	"set_time": undefined,
	"time": undefined,
	"timeoutid": null,
	"running": false,
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

			// let m = `popMax=${popMax} isRatedStr=${isRatedStr}, isNomadStr=${isNomadStr} isTreasuresStr=${isTreasuresStr} remaining ${this.time} seconds. You know already https://replay-pallas.wildfiregames.ovh/LocalRatings ? Its great for TG's`
			let m = `popMax=${popMax}${isRatedStr}${isNomadStr}${isTreasuresStr} remaining ${this.time} seconds. You know already https://replay-pallas.wildfiregames.ovh/LocalRatings ? Its great for TG's`
			print(m)
			sendMessage(m)
		} catch (error) {
			sendMessage(`Start in ${this.time} seconds. 25-0128_0922-29` )

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
