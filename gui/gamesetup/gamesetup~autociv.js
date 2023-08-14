warnModIsNotEnabled(); // check for feldmap mod is default 23-0624_0327-45
warnSilhouettesIsNotEnabled()

var g_selfInHost

var g_autociv_maps = new Set(["maps/skirmishes/Volcano Island (8)"])

var g_autociv_hotkeys = {
	"autociv.open.autociv_readme": function (ev)
	{
		Engine.PushGuiPage("page_autociv_readme.xml");
},
	"autociv.gamesetup.focus.chatInput": function (ev)
	{
		Engine.GetGUIObjectByName("chatInput").blur();
		Engine.GetGUIObjectByName("chatInput").focus();
	},
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



function handleInputBeforeGui(ev)
{
	g_resizeBarManager.onEvent(ev);
	return false;
}

function setDefaultsToOptionsPersonalizationWhenNewInstalled()
{
	botManager.get("playerReminder").load(true);
	botManager.get("mute").load(true);
	botManager.get("vote").load(false);
	botManager.get("autociv").load(true);
	botManager.get("link").load(true);
	botManager.setMessageInterface("gamesetup");
	autociv_InitSharedCommands()
}

autociv_patchApplyN("init", function (target, that, args)
{
	Engine.GetGUIObjectByName("chatText").buffer_zone = 2.01
	Engine.GetGUIObjectByName("chatText").size = Object.assign(Engine.GetGUIObjectByName("chatText").size, {
		left: 4, top: 4, bottom: -32
	})

	setDefaultsToOptionsPersonalizationWhenNewInstalled();

	target.apply(that, args);

	// React to hotkeys
	for (let hotkey in g_autociv_hotkeys)
		Engine.SetGlobalHotkey(hotkey, "Press", g_autociv_hotkeys[hotkey]);

	// React to chat and messages
	for (let type of NetMessages.prototype.MessageTypes)
		g_SetupWindow.controls.netMessages.registerNetMessageHandler(type, msg => botManager.react(msg))

	g_autociv_countdown.init();

	Engine.GetGUIObjectByName("chatInput").blur();
	Engine.GetGUIObjectByName("chatInput").focus();

	// var g_PlayerAssignments = {};
	// var playerNameHost = g_PlayerAssignments[0].name;
	// warn(`g_PlayerAssignments.length = ${g_PlayerAssignments.length}`);

	setTimeout(() => {
		// Asynchronous operation
		try {
			g_selfInHost = isSelfHost() // the g_selfInHost is set a bit later. so a delay is needed here
			.then(result => {
			// warn(`works`);
			})
			.catch(error => {
			// warn(error);
			});
		} catch (error) {
			// Handle the error gracefully or simply ignore it
		}
	}, 10);

	setTimeout(() => {
		ifYouHostAndModsChangedRecomandRestoreLastProfile()
	}, 20);


})

function warnModIsNotEnabled(){
	const key = "autocivP.gamesetup.warnModIsNotEnabled";  // default it will warn
	var warnThisModIsNotEnabled = Engine.ConfigDB_GetValue(
		"user",
		key
	);
	if(!warnThisModIsNotEnabled){
		warnThisModIsNotEnabled = 'feldmap'; // default it will warn
		ConfigDB_CreateAndSaveValueA26A27("user", key, warnThisModIsNotEnabled);
	}
	if(warnThisModIsNotEnabled != 'false'){  // default it will warn
		const modEnabledmods = Engine.ConfigDB_GetValue(
			"user",
			"mod.enabledmods"
		);
		if(!(modEnabledmods.indexOf(warnThisModIsNotEnabled)>0)){
			warn(`Really want play without ${warnThisModIsNotEnabled} mod ?`);
			// warn(`modEnabledmods: ${modEnabledmods} ?`);
		}
	}
}

function warnSilhouettesIsNotEnabled(){
	const key = "silhouettes";  // default it will warn
	var silhouettes = Engine.ConfigDB_GetValue(
		"user",
		key
	);
	if(silhouettes != "true"){
		warn(`Really want play without silhouettes visible? (Settings > Graphics (general) > Unit Silhouettes. Its the fifth option)`);
	}
}





/**
 * Checks if self host and mods have changed and recommends restoring then the last profile.
 */
function ifYouHostAndModsChangedRecomandRestoreLastProfile(){
	const modsFromUserCfg = Engine.ConfigDB_GetValue("user", "mod.enabledmods");
	const modsFromUserCfg_backup = Engine.ConfigDB_GetValue("user", "autocivP.enabledmods.backup");
	// warn(`ifYouHostAndModsChangedRecomandRestoreLastProfile`);
	if(modsFromUserCfg != modsFromUserCfg_backup){
		// const modsFromUserCfg = Engine.ConfigDB_GetValue("user", "mod.enabledmods");
		// const modsFromUserCfg_backup = Engine.ConfigDB_GetValue("user", "autocivP.enabledmods.backup");
		ConfigDB_CreateAndSaveValueA26A27("user", `autocivP.enabledmods.backup`, modsFromUserCfg);

		//   warn('82: have changed enabledmods? do you want restore last profile?');
	  	// g_NetworkCommands["/pRestoreLastProfile"]();
	  	// pRestoreLastProfile();
		let lastCommandToSetProfile = ''
		if(g_selfInHost){
			selfMessage('have changed enabledmods? do you want restore last profile?'); // selfMessage not exist
			const key = 'autocivP.gamesetup.lastCommandProfile'
			const lastCommandProfile = Engine.ConfigDB_GetValue("user", `${key}`);
			selfMessage(`your last used profile was: ${lastCommandProfile}`);
			lastCommandToSetProfile = (lastCommandProfile) ? '/pRestoreLastProfile' : 'hi all ^_^';
		}else{
			lastCommandToSetProfile = 'hi all (◕‿◕)';
		}
		const chatInput = Engine.GetGUIObjectByName("chatInput")
		chatInput.caption = lastCommandToSetProfile;
	}
}
