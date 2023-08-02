/**
 * IMPORTANT: Remember to update session/top_panel/BuildLabel.xml in sync with this.
 */



/**
 * Determines if the autocivP module has just been installed.
 * true when a checkbox is 'true' or 'false'
 * @return {boolean} Returns true if the autocivP module has just been installed, false otherwise.
 */
function is_autocivP_just_now_installed(){
	  const inNextFullMinuteRemove00 = Engine.ConfigDB_GetValue(
		"user",
		"autocivP.gamesetup.gameStart.inNextFullMinuteRemove00" // only false or true valid when checkbox is used
	  );
	return !(inNextFullMinuteRemove00 === 'true' || inNextFullMinuteRemove00 === 'false')
}

if(is_autocivP_just_now_installed()){
	// set a default value when the mod was never installed before
	const value = 'Do you like: Auto-save Drafts in Chat? Never Lose Your Message Again'
	ConfigDB_CreateAndSaveValueA26A27("user", 'autocivP.gamesetup.gameStart.string', value);
}



/**
 * Retrieves the metadata for a replay.
 *
 * @return {Array} The replay metadata sorted by file modification time.
 */
function getReplayMetadata(){
	let replayList = Engine.GetReplays().sort(function(x,y){
		// warn(`x.fileMTime = ${x.fileMTime}`);
		// warn(`x.fileMTime = ${y.fileMTime}`);
		return x.fileMTime - y.fileMTime;
	});

	const replayListKeys = Object.keys(replayList);
	for (let key of replayListKeys) {
		warn(`key = ${key}`);
		const replayListKeys2 = Object.keys(replayListKeys[key]);
		for (let key2 of replayListKeys2) {
			warn(`   key2 = ${key2}`);
			warn(`   val2 = ${replayListKeys2[key2]}`);
			// const replayListKeys = Object.keys(replayList);
		}
		}
}
// getReplayMetadata()
// warn(`g_GameData.gui.replayDirectory = ${g_GameData.gui.replayDirectory}`);




function get_modsString() {
	let modsString = '';
	const modsObj = Engine.GetEngineInfo().mods
	for (let [key, value] of Object.entries(modsObj)) {
			if(key<1) continue;
			for (let [key2, value2] of Object.entries(Engine.GetEngineInfo().mods[key])) {
				if(key2 != 'name' && key2 != 'version') continue;
				modsString += ` ${value2}`; // mod/name/version : ...
			}
	}
	return modsString
}
let modsString = get_modsString()
var g_autocivPVersion = get_autocivPVersion()

const versionName = Engine.GetEngineInfo().mods[0]['name'];

if(versionName != '0ad')
	error(versionName + ' | ' +  versionOf0ad + '. name should by 0ad. hmmm. strange.');

modsString = modsString.replace(/\s+([a-z])/gi , "\n$1"  ) ;
modsString = modsString.replace(/\s+(proGUI)/g , "\n$1(boonGUI, BetterQuickStart)"  ) ;
modsString = modsString.replace(/\s+(autocivP)/g , "\n$1(autociv)"  ) ;
var g_ProjectInformation = {
	"organizationName": {
		"caption": translate("WILDFIRE GAMES")
	},
	"organizationLogo": {
		"sprite": "WildfireGamesLogo"
	},
	"productLogo": {
		"sprite": "0ADLogo"
	},
	"productBuild": {
		"caption": getBuildString()
	},
	"productDescription": {
		"caption":
		((modsString.length < 110 ) ? setStringTags(translate("Alpha XXVI: Zhuangzi"), { "font": "sans-bold-18" })   + "\n" : '')
		 +
		setStringTags(translate(modsString.trim(), { "font": "sans-16" }))
		 + "\n"
	}
};


// var g_ProjectInformation = {
// 	"organizationName": {
// 		"caption": translate("WILDFIRE GAMES")
// 	},
// 	"organizationLogo": {
// 		"sprite": "WildfireGamesLogo"
// 	},
// 	"productLogo": {
// 		"sprite": "0ADLogo"
// 	},
// 	"productBuild": {
// 		"caption": getBuildString()
// 	},
// 	"productDescription": {
// 		"caption": `${setStringTags(translate(modsString.trim(), { "font": "sans-16" }))
// 		 + "\n"
// 		 + setStringTags(translate(`autocivP ${Engine.GetEngineInfo().mods.find(obj => obj.name == "autocivP").version}`), { "font": "sans-16" })}`
// 		 + "\n"
// 	}
// };


var g_CommunityButtons = [

	{
		"caption": translate("Website"),
		"tooltip": translate("Click to open play0ad.com in your web browser."),
		"size": "8 100%-144 50%-4 100%-116",
		"onPress": () => {
			Engine.OpenURL("https://play0ad.com/");
		}
	},
	{
		"caption": translate("Chat"),
		"tooltip": translate("Click to open the 0 A.D. IRC chat in your browser (#0ad on webchat.quakenet.org). It is run by volunteers who do all sorts of tasks, it may take a while to get your question answered. Alternatively, you can use the forum (see Website)."),
		"size": "50%+4 100%-144 100%-8 100%-116",
		"onPress": () => {
			Engine.OpenURL("https://webchat.quakenet.org/?channels=0ad");
		}
	},
	{
		"caption": translate("Report a Bug"),





		"tooltip": translate("Click to visit 0 A.D. Trac to report a bug, crash, or error."),
		"size": "8 100%-108 50%-4 100%-80",
		"onPress": () => {
			Engine.OpenURL("https://trac.wildfiregames.com/wiki/ReportingErrors/");
		}
	},
	{
		"caption": translateWithContext("Frequently Asked Questions", "FAQ"),
		"tooltip": translate("Click to visit the Frequently Asked Questions page in your browser."),
		"size": "50%+4 100%-108 100%-8 100%-80",
		"onPress": () => {
			Engine.OpenURL("https://trac.wildfiregames.com/wiki/FAQ");
		}
	},
	{
		"caption": translate("Translate the Game"),
		"tooltip": translate("Click to open the 0 A.D. translate page in your browser."),
		"size": "8 100%-72 100%-8 100%-44",
		"onPress": () => {
			Engine.OpenURL("https://trac.wildfiregames.com/wiki/Localization");
		}
	},
	{
		"caption": translate("Donate"),
		"tooltip": translate("Help with the project expenses by donating."),
		"size": "8 100%-36 100%-8 100%-8",
		"onPress": () => {
			Engine.OpenURL("https://play0ad.com/community/donate/");
		}
	}
];
