var g_Autociv_addChatMessageOptim = {
	"addChatMessageNoUpdate": function (msg)
	{
		if (msg.from)
		{
			if (Engine.LobbyGetPlayerRole(msg.from) == "moderator")
				msg.from = g_ModeratorPrefix + msg.from;

			// Highlight local user's nick
			if (g_Username != msg.from)
			{
				msg.text = msg.text.replace(g_Username, colorPlayerName(g_Username));

				if (!msg.historic && msg.text.toLowerCase().indexOf(g_Username.toLowerCase()) != -1)
					soundNotification("nick");
			}
		}

		let formatted = ircFormat(msg);
		if (!formatted)
			return;

		g_ChatMessages.push(formatted);
		// Engine.GetGUIObjectByName("chatText").caption = g_ChatMessages.join("\n");
	},
	"notifications": {
		"max": +Engine.ConfigDB_GetValue("user", "autociv.lobby.chat.notifications.max"),
		"count": 0,
		"is": text => text.search(/<.*>/) === -1
	},
	"comments": {
		"max": +Engine.ConfigDB_GetValue("user", "autociv.lobby.chat.comments.max"),
		"count": 0,
		"is": text => text.search(/<.*>/) !== -1
	},
	"updateAfterTick": 3,
	"updateAfterTickRenderOnce": function ()
	{
		if (g_Autociv_TickCount === this.updateAfterTick + 1)
			Engine.GetGUIObjectByName("chatText").caption = g_ChatMessages.join("\n");
	},
	"messagesFilter": function (originalFunction, msg)
	{
		let len1 = g_ChatMessages.length;
		if (g_Autociv_TickCount <= this.updateAfterTick)
			this.addChatMessageNoUpdate(msg);
		else
			originalFunction(msg);

		// If no messages added, do nothing
		if (len1 == g_ChatMessages.length)
			return;

		if (!g_ChatMessages.length)
			return;

		let type = this.comments.is(g_ChatMessages[g_ChatMessages.length - 1]) ?
			this.comments :
			this.notifications;

		++type.count;
		if (type.count <= type.max)
			return;

		g_ChatMessages = g_ChatMessages.filter(message =>
		{
			if (type.count <= type.max || !type.is(message))
				return true;

			--type.count;
			return false;
		});
	}
};

addChatMessage = (function (originalFunction)
{
	return function (msg)
	{
		if (botManager.react(msg))
			return true;

		return g_Autociv_addChatMessageOptim.messagesFilter(originalFunction, msg);
	};

})(addChatMessage)


g_ChatCommands["pingall"] = {
	"description": translate("Ping all 'Online' and 'Observer' players."),
	"handler": function (args)
	{
		let selfNick = Engine.LobbyGetNick();
		let ignore = new Set([selfNick, "Ratings", "WFGbot", "Triumvir", "user1"]);
		let candidatesToAnnoy = new Set();

		for (let host of g_GameList)
		{
			let players = stringifiedTeamListToPlayerData(host.players);
			let selfInHost = players.some(player => splitRatingFromNick(player.Name).nick == selfNick);
			for (let player of players)
				if (selfInHost)
					ignore.add(splitRatingFromNick(player.Name).nick);
				else if (player.Team == "observer")
					candidatesToAnnoy.add(splitRatingFromNick(player.Name).nick);
		}

		for (let player of Engine.GetPlayerList())
			if (player.presence == "available")
				candidatesToAnnoy.add(player.name);

		let annoyList = Array.from(candidatesToAnnoy.difference(ignore)).join(", ");
		Engine.LobbySendMessage(annoyList);
		if (!!args[0].trim())
			Engine.LobbySendMessage(args.join(" "))

		return false;
	}
};

g_ChatCommands["playing"] = {
	"description": translate("Set your state to 'Playing'."),
	"handler": function ()
	{
		Engine.LobbySetPlayerPresence("playing");
		return false;
	}
};

g_NetMessageTypes["chat"]["subject"] = msg =>
{
	// Don't add subject kilometric message
	updateSubject(msg.subject);
	return false;
};

var g_AutocivHotkeyActions = {
	"cancel": function (ev)
	{
		// Engine.GetGUIObjectByName("chatInput").focus();
	},
	"autociv.lobby.openMapBrowser": function ()
	{
		openMapBrowser();
	},
	"autociv.open.autociv_settings": function (ev)
	{
		autocivCL.Engine.PushGuiPage("page_autociv_settings.xml");
	}
};


function handleInputBeforeGui(ev)
{
	resizeBar.onEvent(ev);

	if (ev.hotkey && g_AutocivHotkeyActions[ev.hotkey])
		g_AutocivHotkeyActions[ev.hotkey](ev);

	return false;
}


function mapBrowserCallback() { }
function openMapBrowser()
{
	autocivCL.Engine.PushGuiPage("page_mapbrowser.xml", {}, mapBrowserCallback);
}


function autociv_InitBots()
{
	botManager.get("playerReminder").load(true);
	botManager.get("mute").load(true);
	botManager.get("vote").load(false);
	botManager.get("link").load(true);
	botManager.setMessageInterface("lobby");
	autociv_InitSharedCommands();
}

init = (function (originalFunction)
{
	return function (...args)
	{
		autociv_InitBots();

		originalFunction(...args);

		let fgodMod = Engine.GetEngineInfo().mods.some(mod => mod[0].toLowerCase().startsWith("fgod"));

		let hookList = [
			["profilePanel", "right"],
			["leftButtonPanel", "right"],
			[fgodMod ? "playerList" : "playersBox", "right"]
		];
		if (fgodMod)
			hookList.push(["presenceDropdown", "right"], ["playerGamesNumber", "right"])

		resizeBar("chatPanel", "top", undefined, [[fgodMod ? "gameList" : "gamesBox", "bottom"]])
		resizeBar("middlePanel", "left", undefined, hookList);
		resizeBar("rightPanel", "left", undefined, [["middlePanel", "right"]]);

		let gameInfo = Engine.GetGUIObjectByName("gameInfo");
		let gameInfoUsers = gameInfo.children[gameInfo.children.length - 1];
		let gameInfoDescription = gameInfo.children[gameInfo.children.length - 2];
		resizeBar(gameInfoUsers, "top", undefined, [[gameInfoDescription, "bottom"]], () => !gameInfo.hidden);

		Engine.GetGUIObjectByName("chatInput").focus();
	}
})(init);

var g_Autociv_TickCount = 0;
onTick = (function (originalFunction)
{
	return function ()
	{
		++g_Autociv_TickCount;
		g_Autociv_addChatMessageOptim.updateAfterTickRenderOnce();
		originalFunction();
	}
})(onTick);

// Hack. This two should have their own pushGuiPage but they don't.
setLeaderboardVisibility = (function (originalFunction)
{
	return function (visible)
	{
		resizeBar.disabled = visible;
		originalFunction(visible);
	}
})(setLeaderboardVisibility);


setUserProfileVisibility = (function (originalFunction)
{
	return function (visible)
	{
		resizeBar.disabled = visible;
		originalFunction(visible);
	}
})(setUserProfileVisibility);


function autociv_reconnect()
{
	Engine.ConnectXmppClient();
	autociv_reregister();
}

function autociv_reregister()
{
	if (!Engine.HasNetServer())
		return;

	let autociv_stanza = new ConfigJSON("stanza", false);
	if (!autociv_stanza.hasValue("gamesetup"))
		return;

	let gamesetup = autociv_stanza.getValue("gamesetup");
	let getGame = () => g_GameList.find(entry =>
	{
		return entry.stunIP == gamesetup.stunIP &&
			entry.stunPort == gamesetup.stunPort &&
			entry.hostUsername == gamesetup.hostUsername;
	});

	let checkRegistration = (delay) =>
	{
		setTimeout(() =>
		{
			if (!Engine.HasNetServer())
				return;

			if (!Engine.IsXmppClientConnected())
				return checkRegistration(500);

			let game = getGame();
			if (game !== undefined)
				return checkGameState(0);

			Engine.SendRegisterGame(gamesetup);
			return checkRegistration(Math.min(10000, delay + 500));
		}, delay)
	};

	let checkGameState = (delay) =>
	{
		setTimeout(() =>
		{
			if (!Engine.HasNetServer() ||
				!Engine.IsXmppClientConnected() ||
				!autociv_stanza.hasValue("session"))
				return;

			let game = getGame();
			if (game === undefined || game.state != "init")
				return;

			let session = autociv_stanza.getValue("session");
			Engine.SendChangeStateGame(session.connectedPlayers, session.minPlayerData);
			return checkGameState(Math.min(10000, delay + 500));
		}, delay)
	};

	checkRegistration(500);
}

reconnectMessageBox = function ()
{
	messageBox(
		400, 200,
		translate("You have been disconnected from the lobby. Do you want to reconnect?"),
		translate("Confirmation"),
		[translate("No"), translate("Yes")],
		[null, autociv_reconnect]);
}
