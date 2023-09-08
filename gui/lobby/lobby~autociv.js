var autociv_focus = {
	"gameList": function ()
	{
		let GUIobject = Engine.GetGUIObjectByName("gamesBox");
		GUIobject.blur();
		GUIobject.focus();
	},
	"chatInput" ()
	{
		let GUIobject = Engine.GetGUIObjectByName("chatInput");
		GUIobject.blur();
		GUIobject.focus();

		let do_restartEngine = false
		let clean_array

		const enabledmods = Engine.ConfigDB_GetValue(
			"user",
			"mod.enabledmods"
		  );

		const modProfile_alwaysIn = Engine.ConfigDB_GetValue("user", 'modProfile.alwaysIn');
		let clean = enabledmods;

		if(modProfile_alwaysIn && !(enabledmods.indexOf(modProfile_alwaysIn)>0)){
			clean = clean.replace(/\b(autocivP\w*?)\b/ig, `${modProfile_alwaysIn} $1` );
			do_restartEngine = true
		}

		const autoFixModsOrder = Engine.ConfigDB_GetValue(
			"user",
			"modProfile.showAutoFixModsOrder"
		  );
		const posboonGUI = enabledmods.indexOf('boonGUI')
		const posproGUI = enabledmods.indexOf('proGUI')

		if(autoFixModsOrder === "true" && posboonGUI && posproGUI < posboonGUI ){
			warn(`38: posproGUI < posboonGUI`)

			clean = clean.replaceAll(/\s+\bproGUI\b/g, ' '); // remove proGUI
			clean = clean.replaceAll(/\s*\bboonGUI\b\s*/g, ' proGUI '); // include proGUI instead boonGUI
			// clean = clean.replaceAll(/\bboonGUI\b /g, 'proGUI boonGUI ');
			do_restartEngine = true
		}

		if(do_restartEngine){
			const clean_array = clean.trim().split(/\s+/);
			ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods',clean)
			Engine.SetModsAndRestartEngine(["mod",...clean_array])
			Engine.SetModsAndRestartEngine(["mod",...Engine.GetEnabledMods()])

		}
	}
}

var g_autociv_hotkeys = {
	"autociv.lobby.focus.chatInput": autociv_focus.chatInput,
	"autociv.lobby.focus.gameList": autociv_focus.gameList,
	"autociv.lobby.gameList.selected.join": () => g_LobbyHandler.lobbyPage.lobbyPage.buttons.joinButton.onPress(),
	"autociv.open.autociv_readme": ev => Engine.PushGuiPage("page_autociv_readme.xml"),
	"autociv.lobby.host": ev => g_LobbyHandler.lobbyPage.lobbyPage.buttons.hostButton.onPress(),
	"summary": ev => autociv_showLastGameSummary(),
	/**
	 * Can't unfocus chat input without mouse, use cancel hotkey to unfocus from it
	 * (seems they still get triggered if the hotkey was assigned defined in a xml
	 * object but won't if they were from Engine.SetGlobalHotkey call)
	 */
	"cancel": ev =>
	{
		const obj = Engine.GetGUIObjectByName("gameStateNotifications")
		obj?.blur()
		obj?.focus()
	}
};



function autociv_showLastGameSummary ()
{
	const replays = Engine.GetReplays(false)
	if (!replays.length)
	{
		messageBox(500, 200, translate("No replays data available."), translate("Error"))
		return
	}

	const lastReplay = replays.reduce((a, b) => a.attribs.timestamp > b.attribs.timestamp ? a : b)
	if (!lastReplay)
	{
		messageBox(500, 200, translate("No last replay data available."), translate("Error"))
		return
	}

	const simData = Engine.GetReplayMetadata(lastReplay.directory)
	if (!simData)
	{
		messageBox(500, 200, translate("No summary data available."), translate("Error"))
		return
	}

	Engine.PushGuiPage("page_summary.xml", {
		"sim": simData,
		"gui": {
			"replayDirectory": lastReplay.directory,
			"isInLobby": true,
			"ingame": false,
			"dialog": true
		}
	})
}
function handleInputBeforeGui (ev)
{
	g_resizeBarManager.onEvent(ev);
	return false;
}

function setDefaultsToOptionsPersonalizationWhenNewInstalled ()
{
	botManager.get("playerReminder").load(true);
	botManager.get("mute").load(true);
	botManager.get("vote").load(false);
	botManager.get("link").load(true);
	botManager.setMessageInterface("lobby");
	autociv_InitSharedCommands();
}



autociv_patchApplyN("init", function (target, that, args)
{
	// setTimeout doesn't have tick update in lobby -> make one
	Engine.GetGUIObjectByName("middlePanel").onTick = () =>
	{
		g_Time = Date.now();
		updateTimers()
	}

	setDefaultsToOptionsPersonalizationWhenNewInstalled();

	// SEND PATCH TO PHAB
	Engine.GetGUIObjectByName("chatText").buffer_zone = 2.01
	Engine.GetGUIObjectByName("chatText").size = Object.assign(Engine.GetGUIObjectByName("chatText").size, {
		left: 4, top: 4, bottom: -32
	})

	target.apply(that, args);

	// React to hotkeys
	for (let hotkey in g_autociv_hotkeys)
		Engine.SetGlobalHotkey(hotkey, "Press", g_autociv_hotkeys[ hotkey ]);

	// React to GUI objects resize bars
	{
		g_resizeBarManager.add("chatPanel", "top", undefined, [ [ "gamesBox", "bottom" ] ])
		g_resizeBarManager.add("middlePanel", "left", undefined, [ [ "leftPanel", "right" ] ]);
		g_resizeBarManager.add("middlePanel", "right", undefined, [ [ "rightPanel", "left" ] ]);

		let gameInfo = Engine.GetGUIObjectByName("sgMapName")?.parent;
		if (gameInfo)
		{
			let gameInfoUsers = gameInfo.children[ gameInfo.children.length - 1 ];
			let gameInfoDescription = gameInfo.children[ gameInfo.children.length - 2 ];
			g_resizeBarManager.add(gameInfoUsers, "top", undefined, [ [ gameInfoDescription, "bottom" ] ], () => !gameInfo.hidden);
		}
	}

	// Disable/enable resize bars when these "pages" open/close
	g_LobbyHandler.leaderboardPage.registerOpenPageHandler(() => { g_resizeBarManager.ghostMode = true })
	g_LobbyHandler.leaderboardPage.registerClosePageHandler(() => { g_resizeBarManager.ghostMode = false })
	g_LobbyHandler.profilePage.registerClosePageHandler(() => { g_resizeBarManager.ghostMode = false })

	autociv_focus.chatInput();
	g_LobbyHandler.lobbyPage.autocivLobbyStats = new AutocivLobbyStats()

	initChatFilterInput()
});

// Start the lobby chat input with s? to filter all the chat messages, remove s? to disable
function initChatFilterInput()
{
	let active = false
	let searchText = ""

	const chatInput = Engine.GetGUIObjectByName("chatInput")
	const chatText = Engine.GetGUIObjectByName("chatText")
	let originalList = []

	autociv_patchApplyN(ChatMessagesPanel.prototype, "addText", function (target, that, args)
	{
		if (active)
		{
			chatText.list = originalList
		}
		const res = target.apply(that, args)
		if (active)
		{
			originalList = chatText.list
			chatText.list = originalList.filter(t => t.includes(searchText))
		}
		return res
	})

	/*NOTE - Search with "s?"
	This code snippet is an event handler that is triggered when the user types in a chat input.
	It checks if the text in the chat input starts with "s?".
	If so, it updates the chatText.list to only display items that include the search text.
	If the user is not in filter mode, it restores the original list of chat items.
	*/
	// This might cause some other functionality to stop working
	chatInput.onTextEdit = () =>
	{
		const text = chatInput.caption
		const inFilterMode = text.startsWith("s?")

		// const inFilterTranlateMode = text.startsWith("t?")
		// if(inFilterTranlateMode)
		// 	inFilterMode = true


		if(inFilterMode && !active)
		{
			originalList = chatText.list
		}

		if (inFilterMode)
		{

			active = true


			const textWithoutFilterPrefix = text.slice(2)
			warn(`textWithoutFilterPrefix = ${textWithoutFilterPrefix}`)


		// const inFilterTranlateMode = text.startsWith("t?")


/*NOTE -
searchText"L1L2 in lobby chat

The "searchText" is a regular expression that represents the text to be searched or translated.
The fist double quotes is optional and can be used to indicate a specific phrase or text.
L1 represents the language code for the source language from which the text is being translated.
L2 represents the language code for the target language to which the text is being translated.
The language codes are expected to be two-letter codes that represent specific languages.
For example, "en" for English, "es" for Spanish, "fr" for French, and so on.

If the sourceLanguage is equal to the targetLanguage, then you could copy the result from the caption.

*/

			let inFilterTranlateMode = false
			const match = textWithoutFilterPrefix.toLowerCase().match(/["']?([^\n]+)["']([a-z]{2})([a-z]{2})/);
			if(match){
				searchText = match[1]
				inFilterTranlateMode = true
				// warn(`inFilterTranlateMode = ${inFilterTranlateMode}`)
				// warn(`searchText = ${searchText}`)
			}else
				searchText = text.slice(2).trimStart()

			if(false){
				chatText.list = originalList.filter(t => t.includes(searchText))
			}else{ // new. regex offers more options
				const regex = new RegExp(searchText);
				// warn(searchText)
				chatText.list = originalList.filter(t => regex.test(t));
			}

			// warn('cursor at beginning + [tab] ==> chat is copied to the chat text')

			if(inFilterTranlateMode){
				// const number = match[1];
				const number = 'all';
				let sourceLanguage = 'en'
				let targetLanguage = null

				// selfMessage(`211: gameState = ${gameState}`)
				// return

				if(match[3]){
					sourceLanguage = match[2]
					targetLanguage = match[3]
				}else if(match[2]){
					targetLanguage = match[2]
				}

				const linesArray = chatText.list;

				const lastLines = number == 'all' ? linesArray : linesArray.slice(-number);

				// remove all format like [...] now:
				const lastLinesString = lastLines.join('\n').replace(/\[[^\[\]]*\]+/gi, '');

				if(!sendChatTranslated(chatInput, lastLinesString, sourceLanguage, targetLanguage)){
					// when sourceLanguage == targetLanguage then its false end then you jump here
					// then you simply could copy the result from the caption
					chatInput.caption = lastLinesString
				}
			}

		}
		else
		{
			if (!active) return
			active = false
			chatText.list = originalList
		}
	}
}

class AutocivLobbyStats
{
	lobbyPageTitle = Engine.GetGUIObjectByName("lobbyPageTitle")
	nOfPlayers = 0
	nOfGames = 0
	pageTitle = this.lobbyPageTitle.caption

	constructor()
	{
		// I suppose the page handlers have been loaded before this one, so should work out
		this.nOfGames = g_LobbyHandler.lobbyPage.lobbyPage.panels.gameList.gameList.length
		this.nOfPlayers = g_LobbyHandler.lobbyPage.lobbyPage.panels.playerList.nickList.length
		this.update()

		g_LobbyHandler.xmppMessages.registerXmppMessageHandler("game", "gamelist", () =>
		{
			// I suppose the page handlers have been loaded before this one, so should work out
			this.nOfGames = g_LobbyHandler.lobbyPage.lobbyPage.panels.gameList.gameList.length
			this.update()
		});

		g_LobbyHandler.xmppMessages.registerPlayerListUpdateHandler(() =>
		{
			// I suppose the page handlers have been loaded before this one, so should work out
			this.nOfPlayers = g_LobbyHandler.lobbyPage.lobbyPage.panels.playerList.nickList.length
			this.update()
		})
	}

	update ()
	{
		this.lobbyPageTitle.caption = `${this.pageTitle}  P:${this.nOfPlayers}  G:${this.nOfGames}`
	}
}
