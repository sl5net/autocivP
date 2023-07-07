var gameState = "lobby"; // Initial state // // TODO: howto set it like this? g_GameData = data // 	g_GameData.gui.isInGame

var g_fuzzyArrayResult = fuzzyArrayFromjsonFile("moddata/autocivP_IconNames.json", false)

var g_is_chatInputTooltipQuickFixUpdate_updated = false

// const selfNick = Engine.LobbyGetNick();
var g_selfNick = Engine.ConfigDB_GetValue("user", `playername.multiplayer`);



// Engine.GetCurrentReplayDirectory
// GetEngineInfo.gameState.data
// if (false && Engine.HasReplayInterface()) {
	// Replay is running
	// Your code here for handling when a replay is running
	// selfMessage('in replay')
//   } else {
	// Replay is not running
	// Your code here for handling when a replay is not running
	// selfMessage('not in replay')
//   }

// var g_GameData = GetEngineInfo().data.stat; // not defined



const versionOf0ad = Engine.GetEngineInfo().mods[0]['version']; // 0.0.26
const whatsAutocivPMod = 'AutoCivP mod is AutoCiv but it also supports profiles during game configuration, jitsi, command-history⟦Tab⟧⟦Tab⟧ and a lot more.';


/**
 * Generates a fuzzy array from a given JSON file.
 *
 * @param {string} jsonFile - The path to the JSON file.
 * @return {Object} - The fuzzy array generated from the JSON file.
 */
function fuzzyArrayFromjsonFile(jsonFile, useLevenshtein){
	const customIconJson = Engine.ReadJSONFile(jsonFile);
	const customIconKeys = Object.keys(customIconJson);
	let fuzzyArrayResult = {}
	for (const key of customIconKeys) {
		const values = customIconJson[key];
		const fuzzyVals = FuzzySet(values, useLevenshtein, 2, 8);
		fuzzyArrayResult[key] = fuzzyVals;
	}
    return fuzzyArrayResult;
}


function chatInputTooltipQuickFixUpdate() {
	if(g_is_chatInputTooltipQuickFixUpdate_updated) return

	// this is a workaround. should be moved to gui/... /ChatInputPanel or something
	const chatInput = Engine.GetGUIObjectByName("chatInput")
	if(chatInput){
	  chatInput.tooltip += ' Or try ‹Tab› to autocomplete commands for select profile, chosen icons (☯ ♪♣‹) or other commands. Write "⁄help" or  "⁄help ⁄∖d" or  "⁄help ⁄p" for more info about "/" commands.'
	  chatInput.tooltip += ' Matching algorithm is more strict when text is longer.'
	}

	g_is_chatInputTooltipQuickFixUpdate_updated = true
}


function translGGWP_splitInWords_II(captionTrimed, minMatchScore){

	if(!minMatchScore)
	{
		selfMessage('69: minMatchScore==${minMatchScore}');
		error('69: minMatchScore==${minMatchScore}');
	}

	const isDebug = false
	if(isDebug)
	selfMessage(`66: splitInWords_II()== >${captionTrimed}<`);
	// const regex = /\b([^‹›\s,\.!;\?]+)\b/g;
	const regex = /\b([^‹›\s]+)\b/g;
	// const regex2 = /(?<!\S)[><](?!\S)/g // dont work
	const regex2 = /([>\-<]+)/g // dont work


	let allIconsInText = captionTrimed.replace(regex, match => {
		if(isDebug)
	  selfMessage(`73: translGGWP_splitInWords_II()==>  ||${match}||`)
	  const translated = translateGlHfWpU2Gg_III(match, minMatchScore)
	  return translated !== null ? translated : match;
	});

	allIconsInText = allIconsInText.replace(regex2, match => {
		// Handle the standalone < or > here
		const isDebug = false
		if(isDebug)
		selfMessage(`79: ${match}`);
		if(!minMatchScore)
		{
			selfMessage('91: minMatchScore==${minMatchScore}');
			error('91: minMatchScore==${minMatchScore}');
		}

		return translateGlHfWpU2Gg_III(match, minMatchScore)
		// return match; // You can replace it with any desired value
	  });

	  if(isDebug)
	selfMessage(`84: translGGWP_splitInWords_II()==> allIconsInText = ||${allIconsInText}||`);
	return allIconsInText
  }


function transGGWP_markedStrings_I(gg, minMatchScore) {
	const isDebug = false
	if(isDebug){
	selfMessage(`79: ____________ transGGWP_markedStrings_I() ___________`);
	// gg = "‹Good game ❧ › ";
	selfMessage(`81: gg=>${gg}<`);
	}
	const ggBackup = gg;
	const markedStringRegex = /(‹[^‹›]*›)/g;
	const markedStrings = gg.match(markedStringRegex) || [];
	const allStrings = gg.split(markedStringRegex);

	if (markedStrings.length === 0) {
		// Handle case when no marked strings are found
		gg =translGGWP_splitInWords_II(gg, minMatchScore);
		if(isDebug)
		selfMessage(`74:transGGWP_markedStrings_I()=>  gg=${gg}`);
		return gg;
	}

	if (markedStrings.length === 1 && allStrings.length === 1) {
		// Handle case when only one marked string is found
		if(isDebug)
		selfMessage(`80:transGGWP_markedStrings_I()=> markedStrings[0]=${markedStrings[0]}`);
	  return markedStrings[0]; // Return the single marked string as is
	}

	const ggParts = allStrings.flatMap((value, index) => {
	  if (index % 2 === 0) {
		// Filter out the marked strings
		let re = [translGGWP_splitInWords_II(value, minMatchScore), markedStrings[index / 2]];
		if(isDebug)
		selfMessage(`88:transGGWP_markedStrings_I()=> re=>${re}<`);
		return re
	  }
	//   return value;
	});

	const re = ggParts.join(''); // Concatenate the array elements without a separator
	if(isDebug)
	selfMessage(`93: re=${re}`);
	return re;
  }



function translateGlHfWpU2Gg_III(gg, minMatchScore) {
	const isDebug = false
	if(!minMatchScore ){
	  selfMessage(`140: minMatchScore = ${minMatchScore}`);
	  error(`minMatchScore is not defined`);
	}

	// https://unicodeemoticons.com/
	// btw guiObject is not definded her so you cant use this: sendMessageGlHfWpU2Gg(..., guiObject)


	// ‹be right back ☯ ›

	let text =  '';

	let query
	query = gg;
	// warn('/' + '‾'.repeat(32));
	const result = findBestMatch(query, g_fuzzyArrayResult, minMatchScore);
	if(isDebug){
	warn(`120: Best match for query "${query}": ##${result.bestMatch}## (${result.bestMatchWord})`);
	selfMessage(`120: Best match for query "${query}": ##${result.bestMatch}## (${result.bestMatchWord} , ${minMatchScore})`);
	warn('\\________________________________')
	}

	if(result.bestMatch)
		return result.bestMatch;
	else
		return gg;

		// todo: this is not working. needs implementd again

	  const lowercaseGg = gg.toLowerCase()
	  if (lowercaseGg == 'allicons') {
		const vArr = Object.values(ggMap);
		var s = vArr.join(', ');
		return s
	  }
	  if (lowercaseGg == 'alliconkeys') {
		const vArr = Object.keys(ggMap);
		var s = vArr.join(', ');
		return s
	  }

	return text;
}



function getNextLastCommandID(){
	let nextID = g_lastCommandID + 1
	if(nextID > g_lastCommandIDmax) nextID = 0
	return nextID
}
function saveLastCommand2History(lastCommand){
	const doDebug = false // debug session
	// selfMessage(`lastCommand = ${lastCommand}`);
	if(!lastCommand)
	  return;
	lastCommand = lastCommand.trim()
	if(!lastCommand)
	  return;
	if(lastCommand == g_lastCommand)
	  return;
	// selfMessage(`lastCommand = ${lastCommand}`);
	let lastCommandID_i = 0
	let offset = 0
	let needChechedIdsFromBeging = (g_lastCommandID == 0) ? false : true
	let isFreeHistory = false
	for (let i = 0; i <= g_lastCommandIDmax; i++) {
	  lastCommandID_i = i + g_lastCommandID + offset; // maybe 5 6 7 8 9
	  if(doDebug) selfMessage(`43: lastCommandID_i = ${lastCommandID_i}`)

	  if (lastCommandID_i > g_lastCommandIDmax)
	  	lastCommandID_i -= g_lastCommandIDmax; // maybe 1 2 3 4
	  const lastCommand_i = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${lastCommandID_i}`);
	  if(!lastCommand_i.length){ // selfMessage('is empty');
			if(!needChechedIdsFromBeging){
				isFreeHistory = true
				break;
				if(doDebug) selfMessage(`51: lastCommandID_i = ${lastCommandID_i}`)
			}
			else
				{
					offset = - i - g_lastCommandID // so loop start with 0
					if(doDebug) selfMessage(`56: lastCommandID_i = ${lastCommandID_i}`)
					needChechedIdsFromBeging = false
					continue
				}
	  }
	  if(doDebug) selfMessage(`61: id=${lastCommandID_i} >${lastCommand}< ???? >${lastCommand_i}<`)
	  if(lastCommand == lastCommand_i) // dont save it twice
	  {
		  // selfMessage('dont save it twice');
		//   g_lastCommand = lastCommand;
		  return
	  }
	}
	// selfMessage(`757 lastCommand = ${lastCommand}`);
	if(!isFreeHistory)
		lastCommandID_i = getNextLastCommandID()
	g_lastCommandID = lastCommandID_i;
	g_lastCommand = lastCommand;
	ConfigDB_CreateAndSaveValueA26A27("user", `autocivP.chat.lastCommand${g_lastCommandID}`, g_lastCommand);
	ConfigDB_CreateAndSaveValueA26A27("user", `autocivP.chat.g_lastCommandID`, g_lastCommandID);
	// selfMessage(`53: g_lastCommandID = ${g_lastCommandID} saved`);
	if(doDebug) selfMessage(`77: id=${g_lastCommandID}  >${g_lastCommand}< saved`);
	return;
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
		"description": "Say hello (configurable). set /hiAll yourWelcomeText or send with /hiAll yourWelcomeText",
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
				const chatInput = Engine.GetGUIObjectByName("chatInput")
				chatInput.caption = helloAllText
			  }
			}
	},
	"whatsAutocivPMod" : {
		"description": "AutoCivP mod is ",
		"handler": () =>
		{
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.caption = whatsAutocivPMod
		}
	},
	"whatsAutoCivMod" : {
		"description": "AutoCiv mod is ",
		"handler": () =>
		{
			const whatsAutocivMod = 'AutoCiv mod is an aggregation of features meant to enhance the 0 A.D. HotKeys and more. Many players use it.'
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.caption = whatsAutocivMod
		}
	},
	"whatsJitsi" : {
		"description": "Jitsi is ",
		"handler": () =>
		{
			const JitsiText = 'Jitsi is a great way to have quick team calls without any setup process. It can also be used as an audio chat for your 0ad-team.'
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.caption = JitsiText
		}
	},
	"whatstimeNow" : {
		"description": "whats Time now hoursMinute",
		"handler": () =>
		{
			const today = new Date();
			const hours = today.getHours().toString().padStart(2, '0');
			const minutes = today.getMinutes().toString().padStart(2, '0');
			const text = "it's " + hours + ':' + minutes + ' here.';
			const chatInput = Engine.GetGUIObjectByName("chatInput");
			chatInput.caption = text;		}
	},
	"timenow" : {
		"description": "Time here in hoursMinute",
		"handler": () =>
		{
			g_NetworkCommands["/whatstimeNow"]();
		}
	},
	"modsImCurrentlyUsing": {
		"description": "Mods I'm currently using. Or try without the postfix '/' and at the end of the command ⟦Tab⟧",
		"handler": () =>
		{
			const modEnabledmods = Engine.ConfigDB_GetValue(
				"user",
				"mod.enabledmods"
			);
			// sendMessage(`Mods I'm currently using: ${modEnabledmods.slice(11,)}` );
			let text = `Mods I'm currently using: ${modEnabledmods.slice(11,)}`
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.caption = text
		}
	},
	"jitsi": {
		"description": "use of jitsi",
		"handler": () =>
		{
			let text = `to use jiti in you team: 1. open Ally-Chat 2. write j⟦Tab⟧ then enter. 3. write li⟦Tab⟧ or /link`;
			text += ` BTW if you write j⟦Tab⟧ again your last jitsi link will send again(not a new link). Every player has is own link. Means: one link per player.`;
			// in lobby long text will eventually crash the game. 23-0629_0840-55
			// Engine.SendNetworkChat(text);

			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.caption = text

		}
	},
	"li": {
		"description": "use of jitsi in the game",
		"handler": () =>
		{
			let text = ''
			text = `write li⟦Tab⟧ or /link<enter> to open a link`;
			// Engine.SendNetworkChat(text);
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.caption = text
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
		gameState = "lobby";
		ChatCommandHandler.prototype.ChatCommands[key] = {
			"description": g_autociv_SharedCommands[key].description,
			"handler": text =>
			{
				if(key == 'jitsi') // long text a critical in the looby. better not so many commands there with long texts
					return true
				g_autociv_SharedCommands[key].handler(text)
				selfMessage(`482: SharedCommands: ${key} = ${text}`)
				return true
			}
		}
	},
	"gamesetup": key =>
	{
		gameState = "gamesetup";
		g_NetworkCommands["/" + key] = text =>
		{
			saveLastCommand2History(`/${key} ${text}`)
			g_autociv_SharedCommands[key].handler(text)
			return true
		}
	},
	"ingame": key =>
	{
		if(gameState != "ingame" && g_IsReplay){  // default it will warn
			const modEnabledmods = Engine.ConfigDB_GetValue(
				"user",
				"mod.enabledmods"
			);

			const modProfilealwaysInReplay = Engine.ConfigDB_GetValue("user", 'modProfile.alwaysInReplay');
			let clean = modEnabledmods
			const clean2 = clean.replace('autocivP', `${modProfilealwaysInReplay} autocivP` );

			if(!(modEnabledmods.indexOf(modProfilealwaysInReplay)>0)){
				// warn(`Really want play a replay without 'boonGUI' mod ?`);
				ConfigDB_CreateAndSaveValueA26A27("user", "mod.enabledmods", clean2)
				check_modProfileSelector_settings()

				try {
					Engine.Restart(1) // works sometimes Engine. and sometimes: Restart is not a function
				  } catch (error) {
					if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
						warn(error.message)
						warn(error.stack)
					  }
					warn('well done. Please start 0ad now again.')
					Engine.Exit(1) // works
				}

			}
		}
		gameState = "ingame";

		g_NetworkCommands["/" + key] = text =>
		{
			saveLastCommand2History(`/${key} ${text}`)
			g_autociv_SharedCommands[key].handler(text)
			return true
		}
	}
}

/**
 * This code snippet demonstrates how to use fuzzy matching to find the best match for a query in a collection of icon values.
 * It utilizes a fuzzy icon set (fuzzyIcons) and a fuzzy matching library (FuzzySet or fuzzyVals) to find the closest match based on similarity scores.
 *
 * The code snippet includes an example workflow with a predefined query and fuzzy icon values.
 * It demonstrates how to find matches for the query and display the best match with its similarity score using the warn function.
 *
 * @return {undefined} No return value
 */
function fuzzyIconMatcherExample() {
	warn('=====================================');

	// const fuzzyVals = FuzzySet(iconValues, true, 3, 3);
	const fuzzyVals = g_fuzzyArrayResult["♡"];
	const query = "go";
	const matches = g_fuzzyArrayResult["♡"].get(query);

	if (matches !== null) {
	  // The query has a match
	  const similarityScore = matches[0][0];
	  const matchedString = matches[0][1];
	  warn(`The query "${query}" matched to word "${matchedString}" with a similarity score of ${similarityScore}`);
	} else {
	  // No match found for the query
	  warn(`76: No match found for the query "${query}"`);
	}

	// results:
	// WARNING: The query "lve" matched "love" with a similarity score of 0.75
	// WARNING: The query "3" matched "<3" with a similarity score of 0.5
	// WARNING: The query "love" matched "undefined" with a similarity score of 1,love
}


/**
 * Creates a new FuzzySet object.
 *
 * @param {Array} arr - An array of values to initialize the set with. Default is an empty array.
 * @param {boolean} useLevenshtein - Whether to use the Levenshtein distance algorithm for matching. Default is true.
 * @param {number} gramSizeLower - Default is 2. minimum size of the characters in a string.
 * @param {number} gramSizeUpper - Default is 3. maximum size of the characters in a string.
 * @return {Object} A FuzzySet object.
 * @author: https://github.com/axiak/fuzzyset
 */
function FuzzySet(arr, useLevenshtein, gramSizeLower, gramSizeUpper)
{
	let fuzzyset = {

	};

	// default options
	arr = arr || [];
	fuzzyset.gramSizeLower = gramSizeLower || 2;
	fuzzyset.gramSizeUpper = gramSizeUpper || 3;
	fuzzyset.useLevenshtein = (typeof useLevenshtein !== 'boolean') ? true : useLevenshtein;

	// define all the object functions and attributes
	fuzzyset.exactSet = {};
	fuzzyset.matchDict = {};
	fuzzyset.items = {};

	// helper functions
	let levenshtein = function(str1, str2)
	{
		let current = [],
			prev, value;

		for (let i = 0; i <= str2.length; i++)
			for (let j = 0; j <= str1.length; j++)
			{
				if (i && j)
					if (str1.charAt(j - 1) === str2.charAt(i - 1))
						value = prev;
					else
						value = Math.min(current[j], current[j - 1], prev) + 1;
				else
					value = i + j;

				prev = current[j];
				current[j] = value;
			}

		return current.pop();
	};

	// return an edit distance from 0 to 1
	let _distance = function(str1, str2)
	{
		if (str1 === null && str2 === null) throw 'Trying to compare two null values';
		if (str1 === null || str2 === null) return 0;
		str1 = String(str1);
		str2 = String(str2);

		let distance = levenshtein(str1, str2);
		if (str1.length > str2.length)
		{
			return 1 - distance / str1.length;
		}
		else
		{
			return 1 - distance / str2.length;
		}
	};
	let _nonWordRe = /[^a-zA-Z0-9\u00C0-\u00FF, ]+/g;

	let _iterateGrams = function(value, gramSize)
	{
		gramSize = gramSize || 2;
		let simplified = '-' + value.toLowerCase().replace(_nonWordRe, '') + '-',
			lenDiff = gramSize - simplified.length,
			results = [];
		if (lenDiff > 0)
		{
			for (let i = 0; i < lenDiff; ++i)
			{
				value += '-';
			}
		}
		for (let i = 0; i < simplified.length - gramSize + 1; ++i)
		{
			results.push(simplified.slice(i, i + gramSize));
		}
		return results;
	};

	let _gramCounter = function(value, gramSize)
	{
		// return an object where key=gram, value=number of occurrences
		gramSize = gramSize || 2;
		let result = {},
			grams = _iterateGrams(value, gramSize),
			i = 0;
		for (i; i < grams.length; ++i)
		{
			if (grams[i] in result)
			{
				result[grams[i]] += 1;
			}
			else
			{
				result[grams[i]] = 1;
			}
		}
		return result;
	};

	// the main functions
	fuzzyset.get = function(value, defaultValue, minMatchScore)
	{
		// check for value in set, returning defaultValue or null if none found
		if (minMatchScore === undefined)
		{
			minMatchScore = 0.33;
		}
		let result = this._get(value, minMatchScore);
		if (!result && typeof defaultValue !== 'undefined')
		{
			return defaultValue;
		}
		return result;
	};

	fuzzyset._get = function(value, minMatchScore)
	{
		let normalizedValue = this._normalizeStr(value),
			result = this.exactSet[normalizedValue];
		if (result)
		{
			return [
				[1, result]
			];
		}

		let results = [];
		// start with high gram size and if there are no results, go to lower gram sizes
		for (let gramSize = this.gramSizeUpper; gramSize >= this.gramSizeLower; --gramSize)
		{
			results = this.__get(value, gramSize, minMatchScore);
			if (results && results.length > 0)
			{
				return results;
			}
		}
		return null;
	};

	fuzzyset.__get = function(value, gramSize, minMatchScore)
	{
		let normalizedValue = this._normalizeStr(value),
			matches = {},
			gramCounts = _gramCounter(normalizedValue, gramSize),
			items = this.items[gramSize],
			sumOfSquareGramCounts = 0,
			gram,
			gramCount,
			i,
			index,
			otherGramCount;

		for (gram in gramCounts)
		{
			gramCount = gramCounts[gram];
			sumOfSquareGramCounts += Math.pow(gramCount, 2);
			if (gram in this.matchDict)
			{
				for (i = 0; i < this.matchDict[gram].length; ++i)
				{
					index = this.matchDict[gram][i][0];
					otherGramCount = this.matchDict[gram][i][1];
					if (index in matches)
					{
						matches[index] += gramCount * otherGramCount;
					}
					else
					{
						matches[index] = gramCount * otherGramCount;
					}
				}
			}
		}

		function isEmptyObject(obj)
		{
			for (let prop in obj)
			{
				if (obj.hasOwnProperty(prop))
					return false;
			}
			return true;
		}

		if (isEmptyObject(matches))
		{
			return null;
		}

		let vectorNormal = Math.sqrt(sumOfSquareGramCounts),
			results = [],
			matchScore;
		// build a results list of [score, str]
		for (let matchIndex in matches)
		{
			matchScore = matches[matchIndex];
			results.push([matchScore / (vectorNormal * items[matchIndex][0]), items[matchIndex][1]]);
		}
		let sortDescending = function(a, b)
		{
			if (a[0] < b[0])
			{
				return 1;
			}
			else if (a[0] > b[0])
			{
				return -1;
			}
			else
			{
				return 0;
			}
		};
		results.sort(sortDescending);
		if (this.useLevenshtein)
		{
			let newResults = [],
				endIndex = Math.min(50, results.length);
			// truncate somewhat arbitrarily to 50
			for (let i = 0; i < endIndex; ++i)
			{
				newResults.push([_distance(results[i][1], normalizedValue), results[i][1]]);
			}
			results = newResults;
			results.sort(sortDescending);
		}
		let newResults = [];
		results.forEach(function(scoreWordPair)
		{
			if (scoreWordPair[0] >= minMatchScore)
			{
				newResults.push([scoreWordPair[0], this.exactSet[scoreWordPair[1]]]);
			}
		}.bind(this));
		return newResults;
	};

	fuzzyset.add = function(value)
	{
		let normalizedValue = this._normalizeStr(value);
		if (normalizedValue in this.exactSet)
		{
			return false;
		}

		let i = this.gramSizeLower;
		for (i; i < this.gramSizeUpper + 1; ++i)
		{
			this._add(value, i);
		}
	};

	fuzzyset._add = function(value, gramSize)
	{
		let normalizedValue = this._normalizeStr(value),
			items = this.items[gramSize] || [],
			index = items.length;

		items.push(0);
		let gramCounts = _gramCounter(normalizedValue, gramSize),
			sumOfSquareGramCounts = 0,
			gram, gramCount;
		for (gram in gramCounts)
		{
			gramCount = gramCounts[gram];
			sumOfSquareGramCounts += Math.pow(gramCount, 2);
			if (gram in this.matchDict)
			{
				this.matchDict[gram].push([index, gramCount]);
			}
			else
			{
				this.matchDict[gram] = [
					[index, gramCount]
				];
			}
		}
		let vectorNormal = Math.sqrt(sumOfSquareGramCounts);
		items[index] = [vectorNormal, normalizedValue];
		this.items[gramSize] = items;
		this.exactSet[normalizedValue] = value;
	};

	fuzzyset._normalizeStr = function(str)
	{
		if (Object.prototype.toString.call(str) !== '[object String]') throw 'Must use a string as argument to FuzzySet functions';
		return str.toLowerCase();
	};

	// return length of items in set
	fuzzyset.length = function()
	{
		let count = 0,
			prop;
		for (prop in this.exactSet)
		{
			if (this.exactSet.hasOwnProperty(prop))
			{
				count += 1;
			}
		}
		return count;
	};

	// return is set is empty
	fuzzyset.isEmpty = function()
	{
		for (let prop in this.exactSet)
		{
			if (this.exactSet.hasOwnProperty(prop))
			{
				return false;
			}
		}
		return true;
	};

	// return list of values loaded into set
	fuzzyset.values = function()
	{
		let values = [],
			prop;
		for (prop in this.exactSet)
		{
			if (this.exactSet.hasOwnProperty(prop))
			{
				values.push(this.exactSet[prop]);
			}
		}
		return values;
	};


	// initialization
	let i = fuzzyset.gramSizeLower;
	for (i; i < fuzzyset.gramSizeUpper + 1; ++i)
	{
		fuzzyset.items[i] = [];
	}
	// add all the items to the set
	for (i = 0; i < arr.length; ++i)
	{
		fuzzyset.add(arr[i]);
	}

	return fuzzyset;
}

/**
 * Finds the best match for a given query in a fuzzy array.
 *
 * @param {string} query - The query to search for.
 * @param {object} fuzzyArray - The fuzzy array to search in.
 * @return {object} An object containing the best match, the matched word, and the similarity score.
 */
function findBestMatch(query, fuzzyArray, minMatchScore = 0.3) {
	const isDebug = false
	let bestMatch = null;
	let bestMatchWord = null;
	let bestSimilarityScore = 0;

	if(!query)
		return ''
	if(isDebug)
	selfMessage(`findBestMatch for query "${query}"`);

	for (const key in fuzzyArray) {
	  const matches = fuzzyArray[key].get(query);

	  if (matches !== null && matches[0][0] > minMatchScore) {
		const similarityScore = matches[0][0];
		const matchedString = matches[0][1];

		if (false) {
		  warn(`The query "${query}" matched to word "${matchedString}" with a similarity score of ${similarityScore}`);
		  warn(`fuzzyIcon = ${key}`);
		  warn(`minMatchScore = ${minMatchScore}`);
		}

		if (similarityScore > bestSimilarityScore) {
		  bestMatch = key;
		  bestMatchWord = matchedString;
		  bestSimilarityScore = similarityScore;
		}
	  }
	}

	return {
	  bestMatch: bestMatch,
	  bestMatchWord: bestMatchWord,
	  bestSimilarityScore: bestSimilarityScore
	};
  }
