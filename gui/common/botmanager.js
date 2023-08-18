let playerIsGreeted = []
class BotManager
{
	list = new Map();
	messageInterface = "ingame";

	constructor()
	{







	}

	addBot(name, object)
	{
		if (!("toggle" in object))
			object.toggle = function () { this.active = !this.active; }

		if (!("react" in object))
			object.react = function () { }

		if (!("load" in object))
			object.load = function () { }

		autociv_patchApplyN(object, "load", function (target, that, args)
		{
			let [active] = args
			that.loaded = true
			that.active = active
			return target.apply(that, args)
		})

		this.list.set(name, object)
	}

	get(name)
	{
		return this.list.get(name)
	}

	sendMessage(text)
	{
		warn("Can't send sendMessage")
	}

	selfMessage(text)
	{
		warn("Can't send selfMessage")
	}

	/**
	 *
	 * @returns {Boolean} - True means to stop message flow
	 */
	react(msg)
	{
		let data = this.pipe(msg)
		if (!data)
			return false

		for (let [name, bot] of this.list)
			if (bot.loaded && bot.active && bot.react(data))
				return true
		return false
	}

	pipe(msg)
	{
		if (!msg)
			return
		return this.pipeWith[this.messageInterface].pipe(msg)
	}

	pipeWith = {
		"lobby": {
			"pipe": function (msg)
			{
				return this.types[msg.type]?.(msg)
			},
			"types":
			{
				"chat": msg =>
				{
					switch (msg.level)
					{
						case "room-message": return {
							"type": "chat",
							"receiver": Engine.LobbyGetNick(),
							"sender": msg.from,
							"message": msg.text
						}
						case "join": return {
							"type": "join",
							"receiver": Engine.LobbyGetNick(),
							"sender": msg.nick,
							"message": ""
						}

					}
				}
			}
		},
		"gamesetup": {
			"pipe": function (msg)
			{
				let bugIt = false // new implementation so i will watch longer
				bugIt = true &&  g_selfNick.includes("seeh") // experimental

				if(msg.guid){
					const chatInput = Engine.GetGUIObjectByName("chatInput")
					if(chatInput && chatInput.caption == ""){
						const nick = splitRatingFromNick(g_PlayerAssignments[msg.guid].name).nick

						if( nick != g_selfNick
							&& !(playerIsGreeted.includes(msg.guid))){
							// new implementation so i will watch longer
							// bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer
							// assumtion you are the host and a new plyer did fist think (message or selecint or so)

							const doHelloAutomaticSuggestionWhenJoinAgameSetup = Engine.ConfigDB_GetValue("user", "autocivP.msg.helloAutomaticSuggestionWhenJoinAgameSetup") === "true"

							if(doHelloAutomaticSuggestionWhenJoinAgameSetup){
								chatInput.focus()
								chatInput.caption = (g_IsController) ? `Welcome on board ${nick}. ` : ``

								chatInput.buffer_position = chatInput.caption.length
								if(g_selfNick.includes("seeh"))
									chatInput.caption += 'i ♡ autocivP♇ mod'

								playerIsGreeted.push(msg.guid);
								// selfMessage(`you dont want see this message? \n Game > Settings > Options > Personalization > auto hello Suggestion = false`);
							}

						}
					}

				}
				// selfMessage(`${ln()}: ${msg.guid} = msg.guid`)
				return this.types[msg.type]?.(msg)
			},
			"types":
			{
				"chat": function (msg)
				{
					// Ignore message if it comes from the AI (will have translate=true)
					if (msg.translate)
						return
					if (Engine.GetPlayerGUID() === undefined ||
						g_PlayerAssignments[Engine.GetPlayerGUID()] === undefined ||
						msg.guid === undefined ||
						g_PlayerAssignments[msg.guid] === undefined)
						return

					return {
						"type": "chat",
						"receiver": splitRatingFromNick(g_PlayerAssignments[Engine.GetPlayerGUID()].name).nick,
						"sender": splitRatingFromNick(g_PlayerAssignments[msg.guid].name).nick,
						"message": msg.text
					}
				}
				// TODO JOIN, LEAVE (AKA newAssignments)
			}
		},
		"ingame": {
			"pipe": function (msg)
			{
				return this.types[msg.type]?.(msg)
			},
			"types":
			{
				"message": function (msg)
				{
					// Ignore message if it comes from the AI (will have translate=true)
					if (msg.translate)
						return
					if (Engine.GetPlayerGUID() === undefined ||
						g_PlayerAssignments[Engine.GetPlayerGUID()] === undefined ||
						msg.guid === undefined ||
						g_PlayerAssignments[msg.guid] === undefined)
						return

					return {
						"type": "chat",
						"receiver": splitRatingFromNick(g_PlayerAssignments[Engine.GetPlayerGUID()].name).nick,
						"sender": splitRatingFromNick(g_PlayerAssignments[msg.guid].name).nick,
						"message": msg.text,
					}
				},
				"rejoined": function (msg)
				{
					if (Engine.GetPlayerGUID() === undefined ||
						g_PlayerAssignments[Engine.GetPlayerGUID()] === undefined ||
						msg.guid === undefined ||
						g_PlayerAssignments[msg.guid] === undefined)
						return

					return {
						"type": "join",
						"receiver": splitRatingFromNick(g_PlayerAssignments[Engine.GetPlayerGUID()].name).nick,
						"sender": splitRatingFromNick(g_PlayerAssignments[msg.guid].name).nick,
						"guid": msg.guid
					}
				}
			}
		}
	}

	setMessageInterface(messageInterface)
	{
		this.messageInterface = messageInterface

		if ("lobby" == this.messageInterface)
		{
			this.sendMessage = text =>
			{
				if (Engine.HasXmppClient())
					Engine.LobbySendMessage(text)
			}

			this.selfMessage = text =>
			{
				const ftext = setStringTags(`== ${text}`, { "font": "sans-bold-13" })
				g_LobbyHandler.lobbyPage.lobbyPage.panels.chatPanel.chatMessagesPanel.
					addText(Date.now() / 1000, ftext)
			}
		}
		else if ("gamesetup" == this.messageInterface)
		{
			this.sendMessage = text =>
			{
				if (Engine.HasNetClient())
					Engine.SendNetworkChat(text)
			}

			this.selfMessage = text =>
			{
				const ftext = setStringTags(`== ${text}`, { "font": "sans-bold-13" })
				g_SetupWindow.pages.GameSetupPage.panels.chatPanel.chatMessagesPanel.
					addText(ftext)
			}
		}
		else if ("ingame" == this.messageInterface)
		{
			this.sendMessage = text =>
			{
				if (Engine.HasNetClient())
				{
					for (let line of text.split("\n"))
						Engine.SendNetworkChat(line)
				}
				else
					// Only used for offline games.
					g_Chat.ChatMessageHandler.handleMessage({
						"type": "message",
						"guid": "local",
						"text": text
					})
			}

			g_Chat.ChatMessageHandler.registerMessageFormat("autociv_self", new ChatMessageFormatAutocivSelf())

			this.selfMessage = text => g_Chat.ChatMessageHandler.handleMessage({
				"type": "autociv_self",
				"text": text
			})
		}
		else
			warn(`Invalid message interface ${this.messageInterface}`)
	}
}

var botManager = new BotManager();

function selfMessage(text) { botManager.selfMessage(text) }

/**
 * Sends a message, splitting it into chunks if necessary.
 *
 * @param {string} text - The message to be sent.
 * @return {undefined} - This function does not return a value.
 */
function sendMessage(text)
{
	// Messages reduced to the first 255 letters so, send it split if exceeded

	if(true){
	// old style:
		const numChunks = Math.ceil(text.length / sendMessage.maxChunkLength);
		for (let i = 0; i < numChunks; ++i)
			botManager.sendMessage(text.substr(i * sendMessage.maxChunkLength, sendMessage.maxChunkLength));
	}else{
		let i = 0;
		const chunk = text.substring(i * sendMessage.maxChunkLength, (i + 1) * sendMessage.maxChunkLength);
		botManager.sendMessage(chunk);
	}
}

sendMessage.maxChunkLength = 256 - 1;

// ********* Bot botManager.addBot order matters ***********

botManager.addBot("playerReminder", {
	"name": `Keeps a diary of notes of each player you've added. Will show it each time they join a match.`,
	"react": function (data)
	{
		if (data.type != "join")
			return;

		if (!this.instance.hasValue(data.sender))
			return;

		selfMessage(`playerReminder => ${data.sender} : ${this.instance.getValue(data.sender)}`);
	},
	"load": function (active)
	{
		this.instance = new ConfigJSON("playerReminder");
	}
});

botManager.addBot("mute", {
	"name": "Mute bot",
	"react": function (data)
	{
		if (data.type != "chat")
			return;

		return this.instance.hasValue(data.sender);
	},
	"load": function (active)
	{
		this.instance = new ConfigJSON(`mute`);
	}
});

botManager.addBot("vote", {
	"name": "Vote bot",
	"toggle": function (votingChoicesText)
	{
		if (votingChoicesText.trim() == "")
		{
			if (!this.active)
			{
				selfMessage(`You need to add choices. e.g  /vote diplo:teams:nomad:wonder`);
				return;
			}
			this.active = false;
			selfMessage("Voting poll closed.")
			return;
		}
		this.active = true;
		this.resetVoting();
		this.voteChoices = votingChoicesText.split(":").slice(0, 7).map(v => v.trim());
		this.printVoting();
	},
	"playerVote": {/* "playerName" : 1 ... */ },
	"voteChoices": [/* "regi", "nomad", ... */],
	"list": "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
	"resetVoting": function ()
	{
		this.playerVote = {};
	},
	"printVoting": function ()
	{
		let choicesCount = new Array(this.voteChoices.length).fill(0);
		for (let key in this.playerVote)
			choicesCount[this.playerVote[key]] += 1;

		let show = (v, i) => `\n    ${choicesCount[i]}           ${this.list[i]}         ${v} `;
		sendMessage(`\nVotes  Option   ${this.voteChoices.map(show).join("")}`)
	},
	"react": function (data)
	{
		if (data.type != "chat")
			return;

		let choice = data.message.trim().toUpperCase();
		if (choice.length != 1)
			return;

		let index = this.list.indexOf(choice);
		if (this.voteChoices[index] === undefined)
			return;

		let oldVote = this.playerVote[data.sender];
		if (oldVote === index)
			return;

		this.playerVote[data.sender] = index;
		this.printVoting();
	}
});

botManager.addBot("autociv", {
	"name": "AutoCiv bot",
	"fuzzySearch": { /* Will be populated with a FuzzySet instance for each civ code on load*/ },
	// Returns returns the civ code if civ name is found, otherwise undefined
	"searchForCivInText": function (text)
	{
		// Lazy load
		if (!this.generateFuzzySearcher.loaded)
			this.generateFuzzySearcher();

		for (let id in this.fuzzySearch)
		{
			let res = this.fuzzySearch[id].get(text, false, 0.7);
			if (!res)
				continue;

			// Check two first letters match
			let t1 = text.slice(0, 2).toLowerCase();
			if (typeof res[0][1] != "string")
				continue
			let t2 = res[0][1].slice(0, 2).toLowerCase();
			if (t1 == t2)
				return id;
		}
	},
	"react": function (data)
	{
		if (data.type != "chat")
			return;


		let bugIt = false // debug session
		// doDebug = true // debug session

		// bugIt = true && g_selfNick =="seeh" // new implementation so i will watch longer



		// var g_selfNick = Engine.ConfigDB_GetValue("user", `playername.multiplayer`);
		// warn(`var g_selfNick = ${g_selfNick} gui/common/botmanager.js:396`)

		const clean = text =>
		{

			// Ignore if text is player name only (to avoid boring content)
			if(text != g_selfNick){
				/*!SECTION
				The length of 0 A.D. user names can vary, but they typically have a minimum length of 3 characters and a maximum length of 25 characters.
				*/

				if(bugIt){
					selfMessage(`text: ${text} gui/common/botmanager.js:${ln()}`)
				}

				// check if a variable text contains a single space character repeated exactly twice (without any additional spaces in between) anywhere in the string
				 // only longer texts are probably intersting (longer then user names. ao less missunderstandings)

				/*!SECTION
				usernames could have:
				- 2 letters and
				- 3 number and
				- differnz length.

				no spaces inside ? right =
				*/
				const isWithTwoSpacesSomewhere = /\b(\S+)\s(\S+)\s\1\s\2\b/.test(text)
				const isWithOneSpaces = /\s+/.test(text)

				if ( false
					|| isWithTwoSpacesSomewhere
					|| (isWithOneSpaces && text.length > 5)
					|| text.length > 18){
					if(Engine.ConfigDB_GetValue("user", "autocivP.chat.copyAllChatMessages") !== "true" )
						g_chatTextInInputFild_when_msgCommand = ''

					g_chatTextInInputFild_when_msgCommand += `${text}\n`
					g_chatTextInInputFild_when_msgCommand_lines++

					// selfMessage(`text: ${text} gui/common/botmanager.js:${ln()}`)
				}
			}
			// selfMessage(`text: ${text} gui/common/botmanager.js:${ln()}`)
			return text.trim().split(" ")[0].toLowerCase();
		} // end-of-clean function




		// if(doDebug)
		// 	warn(`clean: ${clean} gui/common/botmanager.js:396`)
		if(bugIt){
			const debugMsg = `g_text: ${g_chatTextInInputFild_when_msgCommand} gui/common/botmanager.js:396`
			selfMessage(`${debugMsg}`)
		}

		const firstWord = clean(data.message);
		// const firstWord = 'Gauls';

		// Ignore if text is player name (to avoid similarity with civ names)
		if (game.get.players.name().some(name => firstWord == clean(name)))
			return;



		// Special case: spec makes a player observer.
		if (firstWord == "spec")
		{
			game.set.player.observer(data.sender);
			return;
		}

		// Special case: play makes a player take a free slot.
		if (
			firstWord == "play" &&
			Engine.ConfigDB_GetValue("user", "autociv.gamesetup.play.enabled") == "true"
		)
		{
			game.set.player.play(data.sender);
			return;
		}

		if (firstWord.length < 3) // Ignore if less than 3 char
			return;

		game.set.player.civ(data.sender, this.searchForCivInText(firstWord));
	},
	"generateFuzzySearcher": function ()
	{
		/**
		 * customNamesCivs: Mod independent (ignores civs not in current
		 * enabled mod).
		 * Loaded from file "moddata/autociv_civilizations.json".
		 * You can add any new civ code name you want from any civ you made.
		 * E.g. if you make a new civ called "FoobarCiv", then your civ
		 * code will be "foo" and the possible entries ["foo"(civ code
		 * added automatically, no need to add), "custom name 1", "custom
		 * name 2", "custom name N"].
		 * Doesn't care if uppercase or lowercase for custom name entries
		 * (but does for the civ code).
		 */

		// Load custom civ names.
		let customNamesCivs = Engine.ReadJSONFile("moddata/autociv_civilizations.json");

		// Clear and fill this.fuzzySearch
		this.generateFuzzySearcher.loaded = true;
		this.fuzzySearch = {}

		const randomCivData = {
			"Name": translateWithContext("civilization", "Random"),
			"Code": "random"
		}

		for (let civ of [randomCivData, ...Object.values(g_CivData)])
		{
			// Official full name (translated).
			const civNameVariations = [civ.Name]; // code is shorter string. e.g. "Code":"sele"

			// Custom names if any.
			if (civ.Code in customNamesCivs)
				civNameVariations.push(...customNamesCivs[civ.Code]);

			this.fuzzySearch[civ.Code] = FuzzySet(civNameVariations, true, 3, 3)
		}


	}
});

botManager.addBot("link", {
	"name": "Text link grabber bot",
	"linkList": [],
	"parseURLs": function (text)
	{
		// https://www.regexpal.com/93652
		return text.match(/(sftp:\/\/|ftp:\/\/|http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?/gmi);
	},
	"findAndAdd": function (text)
	{
		let urls = this.parseURLs(text);
		if (urls != null)
			this.linkList.unshift(...urls.reverse())
	},
	"openLink": function (text)
	{
		let i = parseInt(typeof text != "string" ? text : text.trim() != "" ? text : 0);
		if (!Number.isInteger(i) || !this.linkList[i])
			return "No links or invalid index.";

		let url = String(this.linkList[i]);

		// If the URL doesn't have a protocol prefix the game crashes :S
		if (!/(https?|ftp):.*/i.test(url))
			url = "http://" + url.trim();

		Engine.OpenURL(url);
	},
	// Returns pretty info list of all links
	"getInfo": function ()
	{
		let title = `Detected (${this.linkList.length}) links`;
		let textList = this.linkList.map((link, index) => `${index} : ${link}`).reverse()
		return [title].concat(textList).join("\n");
	},
	"react": function (data)
	{
		if (data.type != "chat")
			return;

		this.findAndAdd(data.message);
	}
});
