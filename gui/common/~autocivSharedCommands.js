var gameState = "lobby"; // Initial state // // TODO: howto set it like this? g_GameData = data // 	g_GameData.gui.isInGame

var g_selfIsHost

var g_isnitialIsSet_prettyDisable_prettyEnable = false

const auto_prettyDisable_when_playersNR = Engine.ConfigDB_GetValue(
	"user",
	"autocivP.auto_prettyDisable_when_playersNR"
);


var g_minMatchScore =  Engine.ConfigDB_GetValue(
	"user",
	"autocivP.fuzzy_minMatchScore"
);

var g_playerIsGreeted = []

var g_PLineGithub = 'https://github.com/sl5net/PLine';

// `i ♡ ${g_PLineGithub} mod.`,

var g_PromotePLineWhenGreetInChatMessages = [
  `I want to translate texts from chat partner in 0ad. How do you do it? ${g_PLineGithub}`,
  `You know that you can translate texts from chat partner? ${g_PLineGithub}`,
  `You kan translate texts from chat partner? ${g_PLineGithub}`,
  `You know that you can team audioChat? ${g_PLineGithub}`,
  `You know that you can reuse your chat drafts? ${g_PLineGithub}`,
  `Know msg2 copies 2 messages? For easier translate? Or so ${g_PLineGithub}`,
  `Know how prettyToggle? Quick/easy during the game: Lower Graphics <-> greater Graphics? ${g_PLineGithub}`,
  `Know the communityModToggle command? Quick/easy? ${g_PLineGithub}`,
  `Know how listIcons? ${g_PLineGithub}`,
  `Know you could translate chat to every language you want? Example last message from Spanish (=es) to English (=en): msg1esen. Good? ${g_PLineGithub}`,
  `Know that I can listen to your messages as audio read by AI? This way, I don't need to read. Good? ${g_PLineGithub}`,
  `Know all features are optional in autocivP mod? Example: you only want to use the audio talk feature, then only use the audio talk feature. ${g_PLineGithub}`,
  ``
];


// ' i  ♡ autocivP♇ mod',

/**
 * Determine if the current player is the host player.
 */
function isSelfHost(){ // maybe call it in a settimeout assync function

	let bugIt = false // new implementation so i will watch longer

	if(bugIt)
		selfMessage(`15: isSelfHost() gui/common/~autocivSharedCommands.js`);
	if(g_selfIsHost === true || g_selfIsHost === false){
		if(bugIt)
			selfMessage(`18: g_selfInHost = ${g_selfIsHost} , gui/common/~autocivSharedCommands.js`);
		return g_selfIsHost;
	}
	switch (typeof g_selfIsHost) {
		case 'undefined':
			if(bugIt)
				selfMessage(`24: g_selfInHost = undefined gui/common/~autocivSharedCommands.js`);
			break;
		default:
			if(bugIt)
				selfMessage(`28: g_selfInHost return  gui/common/~autocivSharedCommands.js`);
			error(`148: g_selfInHost return  gui/common/~autocivSharedCommands.js`);
			return
	}
	// selfMessage(`g_selfInHost: ${g_selfInHost}`);
	const selfGUID = Engine.GetPlayerGUID()

	if (typeof g_PlayerAssignments === 'undefined') {
		return false
	}

	const firstPlayerGUID = Object.keys(g_PlayerAssignments)[0];

	const selfPlayerAssignment = g_PlayerAssignments[Engine.GetPlayerGUID()];
	const hostPlayerAssignment = g_PlayerAssignments[firstPlayerGUID];

	bugIt = true && g_selfNick =="seeh" // new implementation so i will watch longer
	let selfIsHost_temp = selfGUID == firstPlayerGUID;

	if(bugIt){ //NOTE -developers want to see the error in the console
		warn(`42: selfPlayerAssignment.name = ${selfPlayerAssignment.name}`);
		warn(`43: hostPlayerAssignment.name = ${hostPlayerAssignment.name}`);
		warn(`44: g_selfInHost =====> ${selfIsHost_temp} ${selfIsHost_temp} ${selfIsHost_temp} ${selfIsHost_temp} ${selfIsHost_temp}`);
		warn(`45: g_selfInHost => ${selfIsHost_temp}`);
		warn(`45: g_IsController => ${g_IsController}`);

		if(selfIsHost_temp != g_IsController){
			let bugIt = false // new implementation so i will watch longer
			bugIt = true && g_selfNick =="seeh" // new implementation so i will watch longer
			if(bugIt){
				error(`g_IsController != selfIsHost_temp : ${g_IsController} != ${selfIsHost_temp}`);
			}
		}


	}
	return selfIsHost_temp
}


// let g_PlayerAssignments;



// Check if g_PlayerAssignments exists and has an object with the specified guid
// if (g_PlayerAssignments && g_PlayerAssignments[guid]) {
// 	const playerName = g_PlayerAssignments[guid].name;
// 	warn(playerName);
//   } else {
// 	console.log("Player with the specified guid does not exist.");
//   }


const g_customIconJson = Engine.ReadJSONFile("moddata/autocivP_IconNames.json");
var g_fuzzyArrayResult = getFuzzyArrayFromJsonFile(g_customIconJson, true)
// var g_fuzzyArrayResult = getFuzzyArrayFromJsonFile("moddata/autocivP_IconNames.json", false)

var g_is_chatInputTooltipQuickFixUpdate_updated = false

// const selfNick = Engine.LobbyGetNick();
var g_selfNick = Engine.ConfigDB_GetValue("user", `playername.multiplayer`);

// buzzwords: var g_chat ... g_chatTextInInputFild_when_msgCommand
var g_chat_draft = ''
// var g_chatTextInInputFild_when_msgCommand = ''
var g_chatTextInInputFild_when_msgCommand = ''
var g_chatTextInInputFild_when_msgCommand_lines = 0

var p_textBeforeTemp = ''

const chatInput = Engine.GetGUIObjectByName("chatInput")
if(chatInput)
  chatInput.caption = '/away 18'

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


/*!SECTION
about mod names about mod.io here tips:
https://wildfiregames.com/forum/topic/24333-guide-for-publishing-mods-on-modio/?do=findComment&comment=554945
*/

// const howToRememberIt = `. take a photo with your phone or better take a screenshot, if you know how. Visit the website and take it. BTW with ...P mod you can copy text from chat.  `


// const howToRememberIt1 = ". Need to remember this? Take a screenshot! Or, if you know the location, take a photo with your phone. If you're in [Platform name - e.g., Discord], the ...P mod can let you copy text from the chat."

// const howToRememberIt2 = ". Need to remember this? The easiest way is to take a screenshot. Or, if you know the location, take a photo with your phone. If the text is selectable, you could also copy and paste it into a document."

// const howToRememberIt3 = ". Having trouble remembering this? Try taking a screenshot or a photo with your phone!"

const howToRememberIt = ". Screenshot it / Photo with your phone. Bonus: With autocivP mod, you can copy chat!";

const versionOf0ad = Engine.GetEngineInfo().mods[0]['version']; // 0.0.26
function getRevisionNumber(versionString) {
	const match = versionString.match(/(\d{2})/); // Matches 2 digits
	return match[1];
  }
  const revisionNumber = getRevisionNumber(versionOf0ad);

// const zipOfAutocivPMod = 'https://api.mod.io/v1/games/5/mods/3105810/files/4097856/download'

const g_autocivPVersion_shared = get_autocivPVersion()
const g_previous_autocivPVersion = get_previous_autocivPVersion(g_autocivPVersion_shared)
const zipOfAutocivPMod = `https://github.com/sl5net/autocivP/releases/latest`
// const zipOfAutocivPMod = `https://github.com/sl5net/autocivP/releases/tag/v${g_previous_autocivPVersion}`

// https://github.com/sl5net/autocivP/releases/tag/v1.0.30

const actuallyWorkingAtVersion = g_previous_autocivPVersion == g_autocivPVersion_shared ? '' : `actually working at version ${g_autocivPVersion_shared}`
// warn(`actually working at version ${actuallyWorkingAtVersion}`)

// const whatsAutocivPMod = `AutoCivP mod is AutoCiv but it also supports profiles during game configuration, jitsi, command-history⟦Tab⟧⟦Tab⟧ and a lot more ( https://wildfiregames.com/forum/topic/107371-autocivp-add-ons-profiles-jitsi-team-call ) \n 1. download newest ZIP here ${zipOfAutocivPMod} \n 2. unzip it \n 3. rename folder to "autocivP" \n 4. copy this folder to "mods" folder. Path to user data: \n Linux     : ~/.config/0ad/mods \n Windows: %AppData%\\0ad\\mods \n macOS    : \/Users\/{YOUR USERNAME}\/Library\/Application\\ Support/0ad/mods \n tart 0 A.D., click Settings and Mod Selection. \n Double-click it, click Save Configuration and Start Mods. \n ${actuallyWorkingAtVersion} `
//
const whatsAutocivPMod = `AutoCivP ▐itlip.com ▐SL5.de/mods ▐github.com/sl5net/autocivP ${howToRememberIt}`

const whatsAutocivPMod_long = `AutoCivP mod is AutoCiv but it also supports profiles during game configuration, jitsi and a lot more ( https://wildfiregames.com/forum/topic/107371-autocivp-add-ons-profiles-jitsi-team-call ) \n 1. download newest ZIP here ${zipOfAutocivPMod} \n 2. unzip it \n 3. copy this folder to "mods" folder.  4. \n Double-click it in "Settings" > "Mod Selection", click "Save Configuration" and "Start Mods". \n ${actuallyWorkingAtVersion} ${howToRememberIt}`

const whatsCommunityMod = `communityMod is community-powered by the core team to improve the gameplay experience, particularly MP balance. The team wanted to give the community make it easier to contribute, thus this is hosted on gitlab and community members can request commit access ( https://gitlab.com/0ad/0ad-community-mod-a26 ) . ${howToRememberIt}`

const whatsReplay_pallas = ` https://replay-pallas.wildfiregames.ovh/LocalRatings . LocalRatings compares the "Total score" graphs of a player with the "Total score" average graphs. ${howToRememberIt}`
// zipOfAutocivPMod = `https://github.com/sl5net/autocivP/archive/refs/tags/v${g_previous_autocivPVersion}.zip`

const whatsModernGUIA27 = ` https://gitlab.com/4trik/proGUI/-/tree/modernGUIA27 . proGUI-modernGUIA27 or modernGUIA27 looks like BoonGUI but for A27 ${howToRememberIt}`
// https://gitlab.com/4trik/proGUI/-/tree/modernGUIA27
//





function get_previous_autocivPVersion(g_autocivPVersion) {
	const versionParts = g_autocivPVersion.split(".");
	const major = parseInt(versionParts[0]);
	const minor = parseInt(versionParts[1]);
	const patch = parseInt(versionParts[2]);

	// Subtract 1 from the patch version to get the previous version
	const previousPatch = patch - 1;

	// Check if the previous patch version is 0. If so, decrement the minor version and set the patch version to 99.
	const previousMinor = (previousPatch === 0) ? minor - 1 : minor;
	const previousPatchVersion = (previousPatch === 0) ? 99 : previousPatch;

	// Construct the previous version string
	const g_previous_autocivPVersion = `${major}.${previousMinor}.${previousPatchVersion}`;
	return	g_previous_autocivPVersion
}
function get_autocivPVersion() {
	let g_autocivPVersion
	const modsObj = Engine.GetEngineInfo().mods
	for (const [key, value] of Object.entries(modsObj)) {
		if (value.name.toLowerCase() == "autocivP".toLowerCase()) {
			g_autocivPVersion = value.version
			break
		}
	}
	return g_autocivPVersion
}


/**
 * Generates a fuzzy array from a given JSON file.
 *
 * @param {string} jsonFile - JSON file.
 * @return {Object} - The fuzzy array generated from the JSON file.
 */
function getFuzzyArrayFromJsonFile(customIconJson, useLevenshtein){
	// const customIconJson = Engine.ReadJSONFile(jsonFile);
	const customIconKeys = Object.keys(customIconJson);
	let fuzzyArrayResult = {}
	for (const key of customIconKeys) {
		const values = customIconJson[key];
		// communityModToggle = 18
		const fuzzyVals = FuzzySet(values, useLevenshtein, 2, 20); // i used 8 before. not 20 have a long workd 23-0710_2136-42
		fuzzyArrayResult[key] = fuzzyVals;
	}
    return fuzzyArrayResult;
}


function chatInputTooltipQuickFixUpdate() {
	if(g_is_chatInputTooltipQuickFixUpdate_updated) return

	// this is a workaround. should be moved to gui/... /ChatInputPanel or something
	// const ⟦Tab⟧ ‹Tab›
	// const tab = '⟦[color=\"220 255 153\"]Tab[/color]⟧'
	// const tab = '\[Tab\]' // => creates errors
	const tab = '⟦Tab⟧'
	const chatInput = Engine.GetGUIObjectByName("chatInput")
	if(chatInput){
	  chatInput.tooltip += ` Or try ${tab}  to autocomplete commands for select profile, chosen icons ( allicons+${tab} ☯ ♪♣‹) or other commands. Write "⁄help" or  "⁄help  ⁄∖d" or  "⁄help ⁄p" for more info about "/" commands.\n`
	  chatInput.tooltip += ' Matching algorithm is more strict when text is longer.\n'
	  chatInput.tooltip += 'Use uppercase to temporarily reduce the sensitivity of the substitutions mechanism\n'
	  chatInput.tooltip += `Use ${tab} in empty chat to 1. Copy a chat message that was posted to you. 2. Retrieve your chat draft.`
	}

	g_is_chatInputTooltipQuickFixUpdate_updated = true
}

function translGGWP_splitInWords_II(captionTrimed, minMatchScore){
	const regexPattern = / /;
	const splitArray = captionTrimed.split(regexPattern);
	// for (const element of splitArray) {
	// 	console.log(element);
  	// }

	for (const [index, value] of splitArray.entries()) {
		// selfMessage(`Index: ${index}, Value: ${value}`);
		splitArray[index] = translGGWP_splitInWords_II_part2(value, minMatchScore)
		// selfMessage(`Index: ${index}, Value: ${splitArray[index]}`);
	}
	const joinedString = splitArray.join(' ');
	// selfMessage(`225: ${joinedString}`);
	return joinedString
}


function translGGWP_splitInWords_II_part2(captionTrimed, minMatchScore){
	let isDebug = false
	// isDebug = true

	if(captionTrimed == '<3')
		captionTrimed = 'love'

	// selfMessage(`237: translGGWP_splitInWords_II(${captionTrimed}, ${minMatchScore})`);


	if(!minMatchScore && isDebug)
	{
		selfMessage('69: minMatchScore==${minMatchScore}');
		error('69: minMatchScore==${minMatchScore}');
	}

	if(isDebug)
		selfMessage(`247: splitInWords_II()== >${captionTrimed}<`);
	// const regex = /\b([^‹›\s,\.!;\?]+)\b/g;
	const regex = /\b([^‹›\s]+)\b/g;
	// const regex2 = /(?<!\S)[><](?!\S)/g // dont work
	const regex2 = /([>\-<):\(\-\)]+)/g // work for find smilies and arrow

	let allIconsInText = captionTrimed.replace(regex, match => {
		if(isDebug)
	  		selfMessage(`255: translGGWP_splitInWords_II()==>  ||${match}||`)
	  const translated = translGGWP_U2Gg_III(match, minMatchScore)
	  return translated !== null ? translated : match;
	});

	allIconsInText = allIconsInText.replace(regex2, match => {
		// Handle the standalone < or > here
		const isDebug = false
		if(isDebug)
				selfMessage(`264: ${match}`);
		if(!minMatchScore && isDebug)
		{
			selfMessage('91: minMatchScore==${minMatchScore}');
			error('91: minMatchScore==${minMatchScore}');
		}

		return translGGWP_U2Gg_III(match, minMatchScore)
		// return match; // You can replace it with any desired value
	  });

	  if(isDebug)
			selfMessage(`276: translGGWP_splitInWords_II()==> allIconsInText = ||${allIconsInText}||`);
	return allIconsInText
  }


/**
 * Translates marked strings in a given string.
 *
 * @param {string} gg - The input string with marked strings.
 * @param {number} minMatchScore - The minimum match score.
 * @return {string} The translated string with marked strings no replaced.
 */
function transGGWP_markedStrings_I(gg, minMatchScore) {
	let isDebug = false
	// isDebug = true
	if(isDebug){
		selfMessage(`292: ____________ transGGWP_markedStrings_I() ___________`);
		// gg = "‹Good game ❧ › ";
		selfMessage(`294: gg=>${gg}<`);
	}
	const ggBackup = gg;
	const markedStringRegex = /(‹[^‹›]*›)/g;
	const markedStrings = gg.match(markedStringRegex) || [];
	const allStrings = gg.split(markedStringRegex);

	if (markedStrings.length === 0) {
		// Handle case when no marked strings are found
		gg = translGGWP_splitInWords_II(gg, minMatchScore);
		if(isDebug)
			selfMessage(`305:transGGWP_markedStrings_I()=>  gg=${gg}`);
		return gg;
	}

	if (markedStrings.length === 1 && allStrings.length === 1) {
		// Handle case when only one marked string is found
		if(isDebug)
		selfMessage(`312:transGGWP_markedStrings_I()=> markedStrings[0]=${markedStrings[0]}`);
	  return markedStrings[0]; // Return the single marked string as is
	}

	const ggParts = allStrings.flatMap((value, index) => {
	  if (index % 2 === 0) {
		// Filter out the marked strings
		let re = [translGGWP_splitInWords_II(value, minMatchScore), markedStrings[index / 2]];
		if(isDebug)
			selfMessage(`321:transGGWP_markedStrings_I()=> re=>${re}<`);
		return re
	  }
	//   return value;
	});

	const re = ggParts.join(''); // Concatenate the array elements without a separator
	if(isDebug)
		selfMessage(`329: re=${re}`);
	return re;
  }



function translGGWP_U2Gg_III(gg, minMatchScore) {
	let isDebug = false
	// isDebug = true


	if( g_selfNick =="seeh"){
	}

	if(isDebug)
		selfMessage(`344: ____________ translGGWP_U2Gg_III(${gg}, ${minMatchScore}) ___________`);
	if( !minMatchScore){
		if( g_selfNick =="seeh" ){
			// selfMessage(`347: minMatchScore = ${minMatchScore}`);
			// error(`minMatchScore is not defined`);
		}
		minMatchScore = 0.8 // some value. quick fix. todo: why its empty? 23-0729_1618-01
	}

	let lowercaseGg = gg.toLowerCase()
	let doSend2allChatUsers = false
	if (lowercaseGg == 'allicons2All'.toLocaleLowerCase()) {
		doSend2allChatUsers = true
		lowercaseGg = 'allicons'
	}
	if (lowercaseGg == 'allicons') {
	  const vArr = Object.keys(g_customIconJson);
	  let s = 'allicons: '
	  vArr.forEach((k, v) => {
		  const vArr = Object.values(g_customIconJson[k]);
		if(doSend2allChatUsers)
		  	sendMessage(`${k} <- ${vArr}`);
		else
			selfMessage(`${k} <- ${vArr}`);
		  s += `${k} < ${vArr}`
		  s += ` | `
	  })
	  const t = `you dont need write it ecactly. it finds results also if you write to less or bit wrong (its fuzzy-search). disable all icons in settings in options menu. some are contect senitive.`
	  s += t
	  if(doSend2allChatUsers)
		  sendMessage(`${t}`);
	  else
	    selfMessage(`${t}`);
	return s // its big string so it will be cut off somewhere in the middle
	}
	if (lowercaseGg == 'alliconkeys') {
	  const vArr = Object.keys(g_customIconJson);
	  const s = 'alliconkeys: ' + vArr.join(', ');
	  selfMessage(`${s}`);
	  return s
	}



	// https://unicodeemoticons.com/
	// btw guiObject is not definded her so you cant use this: sendMessageGlHfWpU2Gg(..., guiObject)


	// ‹be right back ☯ ›

	let text =  '';

	let query
	query = gg;
	// warn('/' + '‾'.repeat(32));


	let stringWithUnicode = findBestMatch(query, g_fuzzyArrayResult, minMatchScore);


	if(  stringWithUnicode
		&& stringWithUnicode.bestMatch
		&& Engine.ConfigDB_GetValue("user", `autociv.chatText.font.useitwithoutUnicode`) === 'true'
		)
		stringWithUnicode.bestMatch = stringWithUnicode.bestMatch.replace(/[^\x00-\x7F]/g, "");

	// stringWithoutUnicode

	if(isDebug){
		warn(`120: Best match for query "${query}": ##${stringWithUnicode.bestMatch}## (${stringWithUnicode.bestMatchWord})`);
		selfMessage(`414: Best match for query "${query}": ##${stringWithUnicode.bestMatch}## (${stringWithUnicode.bestMatchWord} , ${minMatchScore})`);
		warn('\\________________________________')
	}

	if(stringWithUnicode && stringWithUnicode.bestMatch)
		return stringWithUnicode.bestMatch;

		// todo: this is not working. needs implementd again
	  return gg;
}



function getNextLastCommandID(){
	// selfMessage(`g_lastCommandID = ${g_lastCommandID}       gui/common/~autocivSharedCommands.js`);
	let nextID = g_lastCommandID + 1
	if(nextID > g_lastCommandIDmax) nextID = 0
	return nextID
}
function saveLastCommand2History(lastCommand){
	let doDebug = false // debug session
	// doDebug = true // debug session
	// selfMessage(`lastCommand = ${lastCommand}`);
	if(!lastCommand)
	  return;
	lastCommand = lastCommand.trim()
	if(!lastCommand)
	  return;
	if(lastCommand == g_lastCommand)
	  return;
	if(
		lastCommand.toLocaleLowerCase() == "communityModToggle".toLocaleLowerCase()
	||
		lastCommand.toLocaleLowerCase() == "mainlandTwilightToggle".toLocaleLowerCase()

	){ // maybe a bit to dangerous to trigger it exidentally. so maybe better keep it out of history. what you think?
		g_lastCommand = lastCommand;
		return;
	}

	// selfMessage(`lastCommand = ${lastCommand}`);
	let lastCommandID_i = 0
	let offset = 0
	let needChechedIdsFromBeging = (g_lastCommandID == 0) ? false : true
	let isFreeHistory = false
	for (let i = 0; i <= g_lastCommandIDmax; i++) {
	  lastCommandID_i = i + g_lastCommandID + offset; // maybe 5 6 7 8 9
	  if(doDebug) selfMessage(`456: lastCommandID_i = ${lastCommandID_i}`)

	  if (lastCommandID_i > g_lastCommandIDmax)
	  	lastCommandID_i -= g_lastCommandIDmax; // maybe 1 2 3 4
	  const lastCommand_i = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${lastCommandID_i}`);
	  if(!lastCommand_i.length){ // selfMessage('is empty');
			if(!needChechedIdsFromBeging){
				isFreeHistory = true
				break;
				if(doDebug) selfMessage(`465: lastCommandID_i = ${lastCommandID_i}`)
			}
			else
				{
					offset = - i - g_lastCommandID // so loop start with 0
					if(doDebug) selfMessage(`470: lastCommandID_i = ${lastCommandID_i}`)
					needChechedIdsFromBeging = false
					continue
				}
	  }
	  if(doDebug) selfMessage(`475: id=${lastCommandID_i} >${lastCommand}< ???? >${lastCommand_i}<`)
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
	// selfMessage(`490: g_lastCommandID = ${g_lastCommandID} saved`);
	if(doDebug) selfMessage(`491: id=${g_lastCommandID}  >${g_lastCommand}< saved`);
	return;
  }


// Input expected "name (rating) : message". (rating) optional
function autociv_GetNameRatingText(text)
{
	const spliterIndex = text.indexOf(":");
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
const g_autociv_SharedCommands = {
	"hiAll" : {
		"description": "Say hello (configurable). set /hiAll yourWelcomeText or send with /hiAll yourWelcomeText",
		"handler": (text) =>
		{
					const key = "autocivP.msg.helloAll";
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
	"zipOfAutocivPMod" : {
		"description": "AutoCivP mod is ",
		"handler": () =>
		{
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = `${zipOfAutocivPMod} (28 July 2023)` // that version from 23-0728_0140-50
		}
	},
	"whatsAutocivPMod" : {
		"description": "AutoCivP mod is ",
		"handler": () =>
		{
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = whatsAutocivPMod
		}
	},
	"legend" : {
		"description": "legend of some special symbols",
		"handler": () =>
		{
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = `legend: ♤ proGUI mod, ♇ autocivP mod`

			// text = text.replace('proGUI', 'proGUI♤') //  ♡ autocivP❧♣▦▣ mod
			// text = text.replace(/\bautocivP\b/ig, 'autocivP♇') //  ♡ autocivP❧♣▦▣ mod

		}
	},
	"whatsBatchTraining" : {
		"description": "BatchTraining is ",
		"handler": () =>
		{
			const text = '2021: When BatchTraining reach 27 units, Batching will match 1by1 in Total ActiveTime generated ( https://wildfiregames.com/forum/topic/53327-batch-training-the-good-the-bad-and-the-ugly/ ) '
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
		}
	},
	"whatsProGUI" : {
		"description": "ProGUI mod is ",
		"handler": () =>
		{
			const text = 'Some call ProGUI a better AutoQueue or smart Eco-Management ( https://wildfiregames.com/forum/topic/106491-progui/page/7/ ) .'
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
		}
	},
	"whatsAutoCivMod" : {
		"description": "AutoCiv mod is ",
		"handler": () =>
		{
			const whatsAutocivMod = 'AutoCiv mod is an aggregation of features meant to enhance the 0 A.D. HotKeys and more. Many players use it ( https://wildfiregames.com/forum/topic/28753-autociv-mod-0ad-enhancer ) .'
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = whatsAutocivMod
		}
	},
	"whatsAlliedView" : {
		"description": "AutoCiv mod is ",
		"handler": () =>
		{
			const text = '"Allied View" is a game option thats been added to vanilla 0ad a26. When the option is enabled, allies will basically have "cartography mode" on at the start of the game. '
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
		}
	},
	"whatsBoonGUI" : {
		"description": "AutoCiv mod is ",
		"handler": () =>
		{
			const whatsThisMod = 'boonGUI is best  mod to watch replays (its build by Langbart and others. to could update was moved to https://github.com/0ad-matters/boonGUI ) .'
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = whatsThisMod
		}
	},
	"whatsJitsi" : {
		"description": "Jitsi is ",
		"handler": () =>
		{
			const JitsiText = 'Jitsi is a great way to have quick team calls without any setup process. It can also be used as an audio chat for your 0ad-team.'
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = JitsiText
		}
	},
	"whatsFeldmap" : {
		"description": "feldmap is ",
		"handler": () =>
		{
			const JitsiText = `feldmap mod adds the map "Mainland balanced". Alpine Mountains is also included ( https://https://wildfiregames.com/forum/topic/53880-feldmap ) `
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = JitsiText
		}
	},
	"whatsCommunityMod" : {
		"description": "communityMod is ",
		"handler": () =>
		{
			const text = whatsCommunityMod
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
			//  seems not working in looby but in setup and ingame 23-0806_1937-40 ?
			// and i press tab then to fuzzy search changes it to the toggle command
		}
	},
	"whatsReplay_pallas" : {
		"description": "Replay_pallas is ",
		"handler": () =>
		{
			const text = whatsReplay_pallas
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
		}
	},
	"whatsModernGUIA27" : {
		"description": "ModernGUIA27 is ",
		"handler": () =>
		{
			const text = whatsModernGUIA27
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
		}
	},
	"programmers" : {
		"description": "communityMod is ",
		"handler": () =>
		{
const text = `If you have suggestions for changinge the source-code a bit, share results of your change. Instead of providing suggestions right away, you may could first try implementing your suggestions and then share the results or outcomes. This way, its easys to understand their impact.
BTW for chat maybe use https://matrix.to/#/#0ad:matrix.org, https://webchat.quakenet.org/?channels=0ad, maybe https://discord.gg or any other chat service.
BTW list of functions: https://trac.wildfiregames.com/wiki/EngineFunctions
.`
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text.replace(/\r\t/g, '') // tabe needs to be fut off. also ths wagenrücklauf
		}
	},
	"whatstimeNow" : {
		"description": "whats Time now hoursMinute",
		"handler": () =>
		{
			// selfMessage(`646: whatstimeNow`)
			// warn(`423: whatstimeNow`)

			const today = new Date();
			const hours = today.getHours().toString().padStart(2, '0');
			const minutes = today.getMinutes().toString().padStart(2, '0');
			const text = `it's ${hours}:${minutes} here.`
			const chatInput = Engine.GetGUIObjectByName("chatInput");

			chatInput.focus()
			chatInput.caption = text; // for some reasons this is not working in lobby at the moment 23-0724_0958-02. its ignored
			chatInput.buffer_position = text.length
			// if(g_selfNick =="seeh") //NOTE - 23-0705_2302-57 developers want to see the error in the console
			// 	selfMessage(`659: whatstimeNow: ${text} (gui/common/~autocivSharedCommands.js)`);
		}
	},
	"timenow" : {
		"description": "Time here in hoursMinute",
		"handler": () =>
		{
			if( gameState == "ingame" )
				selfMessage("for using timenow during a ingame chat, remove / and press ⟦Tab⟧");
			const today = new Date();
			const hours = today.getHours().toString().padStart(2, '0');
			const minutes = today.getMinutes().toString().padStart(2, '0');
			const text = `it's ${hours}:${minutes} here.`;
			const chatInput = Engine.GetGUIObjectByName("chatInput");

			if( gameState == "lobby" )
				sendMessage(text)
			else{
				chatInput.focus()
				chatInput.caption = text; // for some reasons this is not working in lobby at the moment 23-0724_0958-02. its ignored
			}
			if(g_selfNick =="seeh") //NOTE - 23-0705_2302-57 developers want to see the error in the console
				selfMessage(`681: timenow: ${text} (gui/common/~autocivSharedCommands.js)`);
		}
	},
	"modsImCurrentlyUsing": {
		"description": "Mods I'm currently using. Or try without the postfix '/' and at the end of the command ⟦Tab⟧",
		"handler": () =>
		{




			if( gameState == "ingame" )
				selfMessage("for show Mods I'm currently using during a ingame chat, remove / and press ⟦Tab⟧");

			const enabledmods = Engine.ConfigDB_GetValue(
				"user",
				"mod.enabledmods"
			);
			// sendMessage(`Mods I'm currently using: ${enabledmods.slice(11,)}` );
			const text = `Mods I'm currently using: ${enabledmods.slice(11,)} ${g_previous_autocivPVersion}`;
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
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
			chatInput.focus()
			chatInput.caption = text

		}
	},
	'li': {
		"description": "use of jitsi in the game",
		"handler": () =>
		{
			let text = ''
			text = `write li⟦Tab⟧ or /link<enter> to open a link`;
			// Engine.SendNetworkChat(text);
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = text
		}
	},

	"mute": {
		"description": "Mute player.",
		"handler": (player) =>
		{
			if (player == "")
				return selfMessage("You need to type a nick to mute player at all places with chat.")
			let nick = splitRatingFromNick(player).nick;

			if(nick == g_selfNick)
				return selfMessage(`not allowed to mute yourself ${g_selfNick}.`)

			botManager.get("mute").instance.setValue(nick, nick);
			selfMessage(`You have muted ${nick}.`);
		}
	},
	"m": {
		"description": "Mute player (m = mute).",
		"handler": (player) =>
		{
			if (player == "")
				return selfMessage("You need to type a nick to mute player at all places with chat.")
			let nick = splitRatingFromNick(player).nick;

			if(nick == g_selfNick)
				return selfMessage(`not allowed to mute yourself ${g_selfNick}.`)

			botManager.get("mute").instance.setValue(nick, nick);
			selfMessage(`You have muted ${nick}.`);
		}
	},
	"u": {
		"description": "Clear list of muted players (u = unmute all).",
		"handler": () =>
		{
			botManager.get("mute").instance.removeAllValues();
			selfMessage("You have cleared muted list.");
		}
	},
	"p": {
		"description": "whatsAutocivPMod",
		"handler": () =>
		{
			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.focus()
			chatInput.caption = whatsAutocivPMod
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
};

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
		const chatInput = Engine.GetGUIObjectByName("chatInput")
		if(chatInput && chatInput.caption.length < 1){
			chatInput.focus()

			let lobbyInitialCaption  = Engine.ConfigDB_GetValue(
				"user",
				"autocivP.lobby.InitialCaption"
				);

				if(lobbyInitialCaption.length < 1){
					lobbyInitialCaption  = '/away'
				}


  			chatInput.caption =lobbyInitialCaption  // '/away' // just a suggestion. maybe you want to be away from the begginning. first check who is online. maybe want join as observer later. not always want play from the begginning.
			// works without any problem, but pipe is maybe not the best way

			// i peronally like to be away as suggestion in the caption because it is easy to read and a learning experience

			// ohter very good implementation see:
			// https://github.com/rossenburgg/godseye/blob/ALARIC/gui/lobby/autoAway.js#L83
		}
		ChatCommandHandler.prototype.ChatCommands[key] = {
			"description": g_autociv_SharedCommands[key].description,
			"handler": text =>
			{
				if(key == 'jitsi') // long text a critical in the looby. better not so many commands there with long texts
					return true
				g_autociv_SharedCommands[key].handler(text)
				// g_autociv_SharedCommands.whatstimeNow.handler()


				// autociv_focus.chatInput

				if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see more
					selfMessage(`903: SharedCommands: '${key}' = '${text}'`)
				}
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
			const enabledmods = Engine.ConfigDB_GetValue(
				"user",
				"mod.enabledmods"
			);

			const modProfilealwaysInReplay = Engine.ConfigDB_GetValue("user", 'modProfile.alwaysInReplay');
			// let clean2 = clean.replace('autocivP', `${modProfilealwaysInReplay} autocivp` );
			// let clean2 = clean.replace( 'autocivp', `${modProfilealwaysInReplay} autocivp` );
			const clean2 = enabledmods.replace(/\b(autocivP\w*?)\b/ig, `${modProfilealwaysInReplay} $1` );

			if(modProfilealwaysInReplay && !(enabledmods.indexOf(modProfilealwaysInReplay)>0)){
				print(`959: Really want play a replay without ${modProfilealwaysInReplay} mod ?\n\n`);
				const clean_array = clean2.split(/\s+/);
				// print(`modProfilealwaysInReplay: ${modProfilealwaysInReplay}\n`);
				// print(`clean2: ${clean2}\n\n`);
				// print(`enabledmods: ${enabledmods}\n\n`);
				// Engine.Exit(1)
				ConfigDB_CreateAndSaveValueA26A27("user", "mod.enabledmods", clean2);
				Engine.SetModsAndRestartEngine(["mod",...clean_array])

			}
			// endOf is replay
		}

		//TODO - delete it later 23-0815_2249-29
		if(gameState != "ingame"){ // to make sure this command is not now already set. later it will be

			let bugIt = false // new implementation so i will watch longer
			// bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer
			if(bugIt){
				// selfMessage(`rated(): ${g_GameSettings.rating.enabled} - gui/common/~autocivSharedCommands.js : 960`)
				selfMessage(`961: rated: ${g_InitAttributes.settings.RatingEnabled === true} - gui/common/~autocivSharedCommands.js : ${linnr()}`)
			}
		}

		// works without error:
		//  selfMessage(JSON.stringify(g_PlayerAssignments));
		// selfMessage(`1093: ${g_Players.length}`) // this also counts Gaia

		// if(!auto_prettyDisable_when_playersNR){
		// 	error('25-0205_1123-17')
		// 	selfMessage(`1094: ${g_isnitialIsSet_prettyDisable_prettyEnable}`)
		// }

		// not useful because of error:
		//  selfMessage(JSON.stringify(g_ProjectInformation));


		if(
			g_isnitialIsSet_prettyDisable_prettyEnable == false
			&& auto_prettyDisable_when_playersNR
			&& g_Players.length > auto_prettyDisable_when_playersNR){
				g_isnitialIsSet_prettyDisable_prettyEnable = true
				// selfMessage(`1093: ${g_Players.length}`) // this also counts Gaia
				prettyGraphicsDisable()
		}




		// to check thats first moment and not already set to "ingame"
		if(gameState != "ingame"
		&& !g_IsObserver
		&& !g_IsReplay){
			// selfMessage(`g_selfNick: ${g_selfNick} - 969`)
			if(Engine.GetPlayerGUID() === undefined
			||	g_PlayerAssignments[Engine.GetPlayerGUID()] === undefined
			|| g_PlayerAssignments[Engine.GetPlayerGUID()].name.indexOf('|') == -1){
				// selfMessage(`name: ${g_PlayerAssignments[Engine.GetPlayerGUID()].name} - 973`)

				// selfMessage(`g_IsReplay: ${g_IsReplay} - 975`)

				const enabledmods = Engine.ConfigDB_GetValue(
					"user",
					"mod.enabledmods"
				);



				const isRated = g_InitAttributes.settings.RatingEnabled === true

				if(g_IsController){ // for your next setup becouse you are host
					const doRatedDefaultAutoupdate = ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.gameStart.doRatedDefaultAutoupdate") === "true" )

					if(doRatedDefaultAutoupdate){
						const isRatedDefault = ( Engine.ConfigDB_GetValue("user", "autocivP.gamesetup.ratedDefault") === "true" )
						// maybe update then rated default.
						if(isRatedDefault != isRated)
							ConfigDB_CreateAndSaveValueA26A27("user", "autocivP.gamesetup.ratedDefault", isRated)
					}
				}

				// for more fairplay if isRated, some mods should be visible as text message when the user name not already show that this mod is used
				if(isRated && enabledmods.indexOf("proGUI") > -1){
					const text = `Mods I use: ${enabledmods.slice(11)}`
					// const text = `Mods I use: ${enabledmods.slice(11)}. \nSome say it's important for others to know \nwhich mods I use when game starts.`
					sendMessage(text)
					// selfMessage(`game.is.rated(): ${game.is.rated()} - 1002`)
				}


			}
		}

		gameState = "ingame";

		// selfMessage()

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
			// warn(` uuuuuuuuuuuuu ${g_minMatchScore})`);
			if(g_minMatchScore)
				minMatchScore = g_minMatchScore
			else
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
 * isNoWord is true if the query is not a word and then the match must be 100%
 *
 * @param {string} query - The query to search for.
 * @param {object} fuzzyArray - The fuzzy array to search in.
 * @param {number} minMatchScore - The minimum similarity score to consider a match (default is 0.3).
 * Higher minMatchScore: Setting a higher minMatchScore will make the function more selective.
 * It will only return very strong matches.
 * This can reduce the number of false positives but might also lead to the function returning null (no match) more often.
 * @return {object} An object containing the best match, the matched word, and the similarity score.
 */
function findBestMatch(query, fuzzyArray, minMatchScore = 0.3) {
	let isDebug = false
	//  isDebug = true
	let bestMatch = null;
	let bestMatchWord = null;
	let bestSimilarityScore = 0;

	if(!query)
		return ''
	if(isDebug){
		selfMessage(`1605: autocivSharedCommands.js: findBestMatch`);
		selfMessage(`1605: findBestMatch for query "${query}"`);
		selfMessage(`1605: minMatchScore = ${minMatchScore}`);
	}



	const regex = /^\W+$/;

	const isNoWord = regex.test(query);

	for (const key in fuzzyArray) {
	  const matches = fuzzyArray[key].get(query);

	  if (matches !== null && matches[0][0] > minMatchScore) {


		const similarityScore = matches[0][0];
		const matchedString = matches[0][1];

		if(isNoWord){
			if(matchedString === query){
				bestMatch = key;
				bestMatchWord = matchedString;
				bestSimilarityScore = similarityScore;
				break
			}else
				continue
		}

		if(isDebug){
			selfMessage(`isNoWord=${isNoWord}, key=${key}, matches = ${matches[0][1]}`);
			selfMessage(JSON.stringify(matches));
		}

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

	if(isDebug)
	selfMessage(`bestMatch = ${bestMatch}, bestMatchWord = ${bestMatchWord}, bestSimilarityScore = ${bestSimilarityScore}`);

	return {
	  bestMatch: bestMatch,
	  bestMatchWord: bestMatchWord,
	  bestSimilarityScore: bestSimilarityScore
	};
  }

// TODO: i crete many funtions names only for debuging. its bit special. later i will dete them 23-0823_1806-14
// for (let i = 1; i <= 100; i++) {
// const functionName = `linnr${i}`;
// const functionBody = `return ;`;
// const functionDefinition = new Function(functionBody);
// this[functionName] = functionDefinition;
// }



  function getDifference(str1, str2) {
	const m = str1.length;
	const n = str2.length;

	const dp = Array(m + 1)
	  .fill(null)
	  .map(() => Array(n + 1).fill(0));

	for (let i = 1; i <= m; i++) {
	  for (let j = 1; j <= n; j++) {
		if (str1[i - 1] === str2[j - 1]) {
		  dp[i][j] = dp[i - 1][j - 1] + 1;
		} else {
		  dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
		}
	  }
	}

	let i = m;
	let j = n;
	let diff = '';

	while (i > 0 && j > 0) {
	  if (str1[i - 1] === str2[j - 1]) {
		i--;
		j--;
	  } else if (dp[i - 1][j] >= dp[i][j - 1]) {
		diff = str1[i - 1] + diff;
		i--;
	  } else {
		diff = str2[j - 1] + diff;
		j--;
	  }
	}

	while (i > 0) {
	  diff = str1[i - 1] + diff;
	  i--;
	}

	while (j > 0) {
	  diff = str2[j - 1] + diff;
	  j--;
	}

	return diff;
  }
