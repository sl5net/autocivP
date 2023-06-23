
function translateGlHfWpU2Gg(gg) {
	// btw guiObject is not definded her so you cant use this: sendMessageGlHfWpU2Gg(..., guiObject)
	let gg2 = ''; // no extra info here probably better (${gg})
	let text =  '';
	if(gg == 'gl')
		text =  '`Good luck`';
	if(gg == 'hf')
		text =  '`Have fun`';
	if(gg == 'gg')
		text =  `Good game${gg2}`;
	if(gg == 'wp')
		text =  `Well played${gg2}`;
	if(gg == 'u2')
		text =  `You too!${gg2}`;
	if(gg == 're')
		text =  `Again?${gg2}`;
// if(text)
	// 	sendMessage(`${text}`);
	return text
}


// Input expected "name (rating) : message". (rating) optional
function autociv_GetNameRatingText(text)
{
	let spliterIndex = text.indexOf(":");
	if (spliterIndex == -1)
		return false;

	let { nick, rating } = splitRatingFromNick(text.slice(0, spliterIndex).trim());
	if (!nick)
		return false;
	return {
		"name": nick,
		"rating": rating,
		"text": text.slice(spliterIndex + 1)
	}
};

// use /command to trigger the following commands:
var g_autociv_SharedCommands = {
	"hiAll" : {
		"description": "Say hello (configurable). set /hiAll yourWelcomeText or use /hiAll yourWelcomeText",
		"handler": (text) =>
		{
			  const key = "autocivP.gamesetup.helloAll";
			  if(text){
				ConfigDB_CreateAndSaveValueA26A27("user", key, text);
				selfMessage(
				  `helloAll was set to ${text}`
				);
			  }else{
				let helloAllText = Engine.ConfigDB_GetValue("user", key);
				if(!helloAllText){
				  helloAllText = 'hi hf.';
				  ConfigDB_CreateAndSaveValueA26A27("user", key, helloAllText);
				}
				sendMessage(`${helloAllText}`);
			  }
			}
	},
	"whatsAutoPCivMod" : {
		"description": "AutoCivP mod is ",
		"handler": () =>
		{	sendMessage('AutoCivP mod is AutoCiv but it also supports profiles during game configuration, jitsi, command-history[tab][tab] and a lot more.')
		}
	},
	"whatsAutoCivMod" : {
		"description": "AutoCiv mod is ",
		"handler": () =>
		{	sendMessage('AutoCiv mod is an aggregation of features meant to enhance the 0 A.D. HotKeys and more. Many players use it.')
		}
	},
	"whatsJitsi" : {
		"description": "Jitsi is ",
		"handler": () =>
		{	sendMessage('Jitsi is a great way to have quick team calls without any setup process. It can also be used as an audio chat for your 0ad-team.')
		}
	},
	"whatstimeNow" : {
		"description": "whats Time now hoursMinute",
		"handler": () =>
		{
			const today = new Date();
			sendMessage("it's " + today.getHours() + ':' + today.getMinutes() + ' here.');
		}
	},
	"timenow" : {
		"description": "Time here in hoursMinute",
		"handler": () =>
		{
			const today = new Date();
			sendMessage("it's " + today.getHours() + ':' + today.getMinutes() + ' here.');
		}
	},
	"modsImCurrentlyUsing": {
		"description": "Mods I'm currently using",
		"handler": () =>
		{
			const modEnabledmods = Engine.ConfigDB_GetValue(
				"user",
				"mod.enabledmods"
			);
			sendMessage(`Mods I'm currently using: ${modEnabledmods.slice(11,)}` );
		}
	},
	"jitsi": {
		"description": "use of jitsi",
		"handler": () =>
		{
			const text = `to use jiti in you team: 1. open Ally-Chat 2. write j<tab> then enter. 3. write li[tab] or /link`;
			const text2 = `BTW if you write j[tab] again your last jitsi link will send again(not a new link). Every player has is own link. Means: one link per player.`;
			Engine.SendNetworkChat(text);
			Engine.SendNetworkChat(text2);
		}
	},
	"mute": {
		"description": "Mute player.",
		"handler": (player) =>
		{
			if (player == "")
				return selfMessage("You need to type a nick to mute.")
			let nick = splitRatingFromNick(player).nick;
			botManager.get("mute").instance.setValue(nick, nick);
			selfMessage(`You have muted ${nick}.`);
		}
	},
	"unmute": {
		"description": "Unmute player.",
		"handler": (player) =>
		{
			if (player == "")
				return selfMessage("You need to type a nick to unmute.")
			let nick = splitRatingFromNick(player).nick;
			botManager.get("mute").instance.removeValue(nick);
			selfMessage(`You have unmuted ${nick}.`);
		}
	},
	"muteclear": {
		"description": "Clear list of muted players.",
		"handler": () =>
		{
			botManager.get("mute").instance.removeAllValues();
			selfMessage("You have cleared muted list.");
		}
	},
	"mutelist": {
		"description": "List of muted players.",
		"handler": () =>
		{
			let list = botManager.get("mute").instance.getIds();
			selfMessage(`Muted ${list.length} people`);
			for (let name of list)
				selfMessage("| " + name);
		}
	},
	"linklist": {
		"description": "Shows the list of links detected in the chat.",
		"handler": () =>
		{
			selfMessage(botManager.get("link").getInfo());
		}
	},
	"link": {
		"description": "Open links from /linklist.",
		"handler": (index) =>
		{
			let err = botManager.get("link").openLink(index);
			if (err)
				selfMessage(err);
		}
	},
	"vote": {
		"description": "Voting poll. Use /vote option1:option2:option3:option4",
		"handler": (votingChoices) =>
		{
			botManager.get("vote").toggle(votingChoices);
		}
	},
	"votereset": {
		"description": "Reset vote poll votes to 0.",
		"handler": () =>
		{
			botManager.get("vote").resetVoting();
			botManager.get("vote").printVoting();
		}
	},
	"voteshow": {
		"description": "Display current votes poll.",
		"handler": () =>
		{
			botManager.get("vote").printVoting();
		}
	},
	"playerReminderToggle": {
		"description": "Keep a note about a player that will show when he joins.",
		"handler": () =>
		{
			botManager.get("playerReminder").toggle();
			selfMessage(`playerReminder has been ${botManager.get("playerReminder").active ? "enabled" : "disabled"}.`)
		}
	},
	"playerReminder": {
		"description": "Keep a note about a player that will show when he joins.",
		"handler": (command) =>
		{
			let data = autociv_GetNameRatingText(command);
			if (!data || !data.name || !data.text)
				return selfMessage("Invalid name and/or note. (Use e.g /playerReminder name : note ).")

			botManager.get("playerReminder").instance.setValue(data.name, data.text);
			selfMessage(`Player ${data.name} has been added to playerReminder list.`);
		}
	},
	"playerReminderRemove": {
		"description": "Keep a note about a player that will show when he joins",
		"handler": (player) =>
		{
			if (player == "")
				return selfMessage("You need to type a nick to remove player reminder.")

			let nick = splitRatingFromNick(player.trim()).nick;
			if (!nick)
				return;

			botManager.get("playerReminder").instance.removeValue(nick);
			selfMessage(`Player ${nick} has been removed from playerReminder list.`);
		}
	},
	"playerReminderList": {
		"description": "Keep a note about a player that will show when he joins",
		"handler": () =>
		{
			let bot = botManager.get("playerReminder").instance;
			let players = bot.getIds();
			if (!players.length)
				return selfMessage(`No playerReminder added.`)

			for (let player of players)
				selfMessage(`Reminder == ${player} : ${bot.getValue(player)}`);
		}
	}
}

function autociv_InitSharedCommands()
{
	if (!(botManager.messageInterface in autociv_InitSharedCommands.pipe))
		return;

	for (let key in g_autociv_SharedCommands)
		autociv_InitSharedCommands.pipe[botManager.messageInterface](key);
}

autociv_InitSharedCommands.pipe = {
	"lobby": key =>
	{
		ChatCommandHandler.prototype.ChatCommands[key] = {
			"description": g_autociv_SharedCommands[key].description,
			"handler": text =>
			{
				g_autociv_SharedCommands[key].handler(text)
				return true
			}
		}
	},
	"gamesetup": key =>
	{
		g_NetworkCommands["/" + key] = text =>
		{
			g_autociv_SharedCommands[key].handler(text)
			return true
		}
	},
	"ingame": key =>
	{
		g_NetworkCommands["/" + key] = text =>
		{
			g_autociv_SharedCommands[key].handler(text)
			return true
		}
	}
}
