/**
 * IMPORTANT: Remember to update session/top_panel/BuildLabel.xml in sync with this.
 */
let modsString = '';
for (let [key, value] of Object.entries(Engine.GetEngineInfo().mods)) {
		if(key<1) continue;
		for (let [key2, value2] of Object.entries(Engine.GetEngineInfo().mods[key])) {
			if(key2 != 'name' && key2 != 'version') continue;
			modsString += ` ${value2}`; // mod/name/version : ... 
		}
}

const versionName = Engine.GetEngineInfo().mods[0]['name'];
const versionOf0ad = Engine.GetEngineInfo().mods[0]['version']; // 0.0.26
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
		"caption": setStringTags(translate("Alpha XXVI: Zhuangzi"), { "font": "sans-bold-18" })
		 + "\n"
		 + setStringTags(translate(modsString.trim(), { "font": "sans-16" }))
		 + "\n"
	}
};
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
