

warnModIsNotEnabled(); // check for feldmap mod is default 23-0624_0327-45
warnSilhouettesIsNotEnabled()

// warn(`5: gui/gamesetup/gamesetup~autociv.js`)

/*NOTE -
 * In 0 A.D. mods or any JavaScript code,
if you use const or let to declare a variable
at the top level of a file or outside of any function,
it will not create a global variable.
Instead, it will create a variable that is scoped to the module or file where it is declared.
Global variables:
variable that can be accessed from anywhere in your code, you can use var to declare the variable at the top level of your file or outside of any function.
in modern JavaScript development, the use of var is generally discouraged in favor of let and const.
let and const provide block-scoping behavior, which can help prevent issues related to variable hoisting and unintended side effects.
*/

var g_selfIsHost

var p_isJoinedGameGreeted = false

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
	// warn(`40: handleInputBeforeGui`);
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

	// warn(`62: gui/gamesetup/gamesetup~autociv.js`)

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



    selfMessage(`83: gui/gamesetup/gamesetup~autociv.js`);

    // selfMessage(`game.is.rated(): ${game.is.rated()} 85`);


	g_selfIsHost = g_IsController // Synonymous variable with g_IsController. for easier to find
	let g_selfIsHost_temp
	// obsolete todo: delete , 23-0814_1558-15 but lets check if its always same first some days/weeks
	if(true)
		setTimeout(() => {
			// Asynchronous operation
			try {
				g_selfIsHost_temp = isSelfHost()
			} catch (error) {
				// Handle the error gracefully or simply ignore it
				warn(`109: ${error} | gui/gamesetup/gamesetup~autociv.js`);
				warn(`110: gui/gamesetup/gamesetup~autociv.js`);
			}
		}, 10);


	// obsolete, seems not obsolete, 23-0822
	if(true)
		setTimeout(() => {
			setCaption_when_JoinOrStart_Setup_suggestRestoreMods_when_modsChanged()
		}, 20);
	else
		setCaption_when_JoinOrStart_Setup_suggestRestoreMods_when_modsChanged()

})


function warnModIsNotEnabled(){
	const key = "autocivP.gamesetup.warnModIsNotEnabled";  // default it will warn
	var warnThisModIsNotEnabled = Engine.ConfigDB_GetValue(
		"user",
		key
	);
	if(!warnThisModIsNotEnabled){
		// warnThisModIsNotEnabled = 'feldmap'; // default it will warn. e.g. feldmap
		// ConfigDB_CreateAndSaveValueA26A27("user", key, warnThisModIsNotEnabled);
		return false
	}
	if(warnThisModIsNotEnabled != 'false'){  // default it will warn
		const enabledmods = Engine.ConfigDB_GetValue(
			"user",
			"mod.enabledmods"
		);
		if(!(enabledmods.indexOf(warnThisModIsNotEnabled)>0)){
			warn(`Really want play without '${warnThisModIsNotEnabled}' mod ?`);
			// warn(`enabledmods: ${enabledmods} ?`);
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
function setCaption_when_JoinOrStart_Setup_suggestRestoreMods_when_modsChanged(){

	const modsFromUserCfg = Engine.ConfigDB_GetValue("user", "mod.enabledmods");
	const modsFromUserCfg_backup = Engine.ConfigDB_GetValue("user", "autocivP.enabledmods.backup");
	const doHelloAutomaticSuggestionWhenJoinAgameSetup = Engine.ConfigDB_GetValue("user", "autocivP.msg.helloAutomaticSuggestionWhenJoinAgameSetup")

	let newCaptionString = ''

	let bugIt = false // new implementation so i will watch longer
	// bugIt = true && g_selfNick.includes("seeh") // new implementation so i will watch longer

	if(bugIt && g_selfNick.includes("seeh")){
		selfMessage(`175: g_selfIsHost=${g_selfIsHost}`);
		selfMessage(`175: modsFromUserCfg=${modsFromUserCfg} , modsFromUserCfg_backup=${modsFromUserCfg_backup}`);
	  }


	if(modsFromUserCfg != modsFromUserCfg_backup){
		// const modsFromUserCfg = Engine.ConfigDB_GetValue("user", "mod.enabledmods");
		// const modsFromUserCfg_backup = Engine.ConfigDB_GetValue("user", "autocivP.enabledmods.backup");
		ConfigDB_CreateAndSaveValueA26A27("user", `autocivP.enabledmods.backup`, modsFromUserCfg);

		//   warn('82: have changed enabledmods? do you want restore last profile?');
	  	// g_NetworkCommands["/pRestoreLastProfile"]();
	  	// pRestoreLastProfile();

		if(g_selfIsHost){
			const difference =getDifference(modsFromUserCfg, modsFromUserCfg_backup).trim()

			// bugIt = g_selfNick.includes("seeh") // new implementation so i will watch longer

			if(bugIt){
				// sad we cannot use 187 here at the moment.
				selfMessage(`188: \nmodsFromUserCfg = \n${modsFromUserCfg}`)
				selfMessage(`189: \nmodsFromUserCfg_backup = \n${modsFromUserCfg_backup}`)
				selfMessage(difference)
			}
			if(	!(difference == 'feldmap' || difference == 'proGUI') ){
				// ignore some mods. like feldmap. some mods are not makes it need to be ask for restore last profile


				// selfMessage('have changed enabledmods? do you want restore last profile?'); // selfMessage not exist
				const key = 'autocivP.gamesetup.lastCommandProfile'
				const lastCommandProfile = Engine.ConfigDB_GetValue("user", `${key}`);
				selfMessage(`your last used profile was: ${lastCommandProfile}`);
				newCaptionString = (lastCommandProfile) ? '/pRestoreLastProfile' : '/help /p'
				if(bugIt)
					warn(`newCaptionString: ${newCaptionString}`);
			}
		}else{
			// your not host
			// if(doHelloAutomaticSuggestionWhenJoinAgameSetup)
			// newCaptionString = 'hi all (◕‿◕)'



			const countPlayers = Object.keys(g_PlayerAssignments).length;
			// selfMessage(`countPlayers: ${countPlayers}`);
			 // is always 0 first when not waiting
			 // dont forget count yourself
			// let hostName = Engine.LobbyGetNick()
			let hostName = ''
			if(countPlayers == 2){

				let firstPlayerGUID = Object.keys(g_PlayerAssignments)[0];
				hostName = g_PlayerAssignments[firstPlayerGUID].name;
				hostName = splitRatingFromNick(hostName).nick


					// 23-0819_1300-37 now i got the case that i joined a game faster then the host :D becouse i got great internet connecten ==> then fix this like so:
					if(hostName == splitRatingFromNick(g_selfNick))
					{
						firstPlayerGUID = Object.keys(g_PlayerAssignments)[1];
						hostName = g_PlayerAssignments[firstPlayerGUID].name;
						hostName = splitRatingFromNick(hostName).nick
					}
			}
			// i ♡ autocivP♇ mod

			const popMax = g_GameSettings.population.cap
			let newBufferPosition = 0

			if(hostName != g_selfNick){ // dont greet yourself
				// needs more tested when is time and get priority 25-0128_1615-15
				newCaptionString = `hi ${countPlayers > 2 ? 'all ': hostName + ' ' }(◕‿◕) BTW: popMax: ${popMax}` //  good luck with setup
			}
			newBufferPosition = newCaptionString.length

			if(doHelloAutomaticSuggestionWhenJoinAgameSetup == 'PLine'){
				const randomg_seeh_greet = g_PromotePLineWhenGreetInChatMessages[Math.floor(Math.random() * g_PromotePLineWhenGreetInChatMessages.length)]

				newCaptionString += randomg_seeh_greet  + '';

				// newCaptionString += ' i ♡ autocivP♇ mod .'

				ConfigDB_CreateAndSaveValueA26A27("user", `AudioTTS.speak`, randomg_seeh_greet);
			}


			const chatInput = Engine.GetGUIObjectByName("chatInput")
			chatInput.caption = newCaptionString
			chatInput.buffer_position = newBufferPosition

			if(bugIt)
				warn(`newCaptionString: ${newCaptionString}`);
		}
	}else{
		// mods have not changed
		const countPlayers = Object.keys(g_PlayerAssignments).length;
		// selfMessage(`countPlayers: ${countPlayers}`);


		if(g_selfIsHost){
			if(doHelloAutomaticSuggestionWhenJoinAgameSetup == 'hello'
				&& countPlayers > 1){ // if you self host and have just started the setup the countPlayers is 1
				newCaptionString = '' // /help /p

				if(g_selfNick.includes("seeh"))
					newCaptionString += ' i ♡ autocivP♇  mod'

				selfMessage(`you dont want see this message? \n Game > Settings > Options > Personalization > auto hello Suggestion = false`);
			}

				// newCaptionString = '(◕‿◕) good luck with setup';
				if(bugIt)
					warn(`newCaptionString: ${newCaptionString}`);
		}else{
			// your not host
			if(doHelloAutomaticSuggestionWhenJoinAgameSetup == 'hello'
				&& p_isJoinedGameGreeted == false){
				p_isJoinedGameGreeted = true
				setTimeout(() => {
					const countPlayers = Object.keys(g_PlayerAssignments).length;
					// selfMessage(`countPlayers: ${countPlayers}`);
					 // is always 0 first when not waiting
					 // dont forget count yourself
					// let hostName = Engine.LobbyGetNick()
					let hostName = ''
					if(countPlayers == 2){

						let firstPlayerGUID = Object.keys(g_PlayerAssignments)[0];
						hostName = g_PlayerAssignments[firstPlayerGUID].name;
						hostName = splitRatingFromNick(hostName).nick


							// 23-0819_1300-37 now i got the case that i joined a game faster then the host :D becouse i got great internet connecten ==> then fix this like so:
							if(hostName == g_selfNick)
							{
								firstPlayerGUID = Object.keys(g_PlayerAssignments)[1];
								hostName = g_PlayerAssignments[firstPlayerGUID].name;
								hostName = splitRatingFromNick(hostName).nick
							}
					}
					// i ♡ autocivP♇ mod

/*
		const isRated = g_GameSettings.rated.isRated ? "Rated" : ""

		const isTreasuresIn = g_GameSettings.disableTreasures.enabled  ? "Treasures" : "";
		const isNomad = g_GameSettings.nomad.enabled ? "Nomad" : ""

*/

				if(hostName != g_selfNick){ // dont greet yourself
					// needs more tested when is time and get priority 25-0128_1615-15
					newCaptionString = `hi ${countPlayers > 2 ? 'all ': hostName + '' }(◕‿◕) BTW popMax is ${popMax}, ${isTreasuresIn}, ${isNomad}` //  good luck with setup
					const newBufferPosition = newCaptionString.length
				}

					if(doHelloAutomaticSuggestionWhenJoinAgameSetup == 'PLine'){
						// newCaptionString +=
						const randomg_seeh_greet = g_PromotePLineWhenGreetInChatMessages[Math.floor(Math.random() * g_PromotePLineWhenGreetInChatMessages.length)]

						newCaptionString += randomg_seeh_greet + ' ';

						selfMessage(`303: g_selfNick: ${g_selfNick}`);

						ConfigDB_CreateAndSaveValueA26A27("user", `AudioTTS.speak`, randomg_seeh_greet);
					}

					const chatInput = Engine.GetGUIObjectByName("chatInput")
					chatInput.caption = newCaptionString
					chatInput.buffer_position = newBufferPosition
					selfMessage(`you dont want see this message? \n Game > Settings > Options > Personalization > auto hello Suggestion = false`);
				}, 5); // seems 1 millisecond is enough but i take more milliseconds
			}
			if(bugIt)
				warn(`newCaptionString: ${newCaptionString}`);

		}
		// endOf: mods have not changed
	}

	if(bugIt)
		warn(`newCaptionString: ${newCaptionString}`);

	if(newCaptionString){
		const chatInput = Engine.GetGUIObjectByName("chatInput")
		chatInput.caption = newCaptionString
	}
}
