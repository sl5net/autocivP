var g_linkLongTeam = null; // init should be available during the game and not changed

/**
 * @param {*} text - Slice of the text from start to buffer position
 * @param {*} list - List of texts to try to auto-complete
 * @param {*} tries - Number of times to try to autocomplete
 */
tryAutoComplete = function (text, list, tries)
{
    if (!text.length){
        return text
    }

    const wordSplit = text.split(/\s/g)
    if (!wordSplit.length)
        return text

    // Get last single word from text until the buffer position
    const lastWord = wordSplit.pop()
    if (!lastWord.length)
        return text

    let firstFound = ""
    for (var word of list)
    {
        if (word.toLowerCase().indexOf(lastWord.toLowerCase()) != 0)
            continue

        if (!firstFound)
            firstFound = word

        --tries
        if (tries < 0)
            break
    }

    if (!firstFound)
        return text

    // Wrap search to start, cause tries could not complete to 0, means there are no more matches as tries in list.
    if (tries >= 0)
    {
        autoCompleteText.state.tries = 1
        word = firstFound
    }

    text = wordSplit.join(" ")
    if (text.length > 0)
        text += " "

    return text + word
}

autoCompleteText = function (guiObject, list)
{
    let caption = guiObject.caption
    let lastCommand = ""
    if (!caption.length){
        // selfMessage('repeat you last command:') // message disabled becouse its also inside the looby. could disturbing a bit.
        lastCommand = Engine.ConfigDB_GetValue("user", "autociv.chat.lastCommand");
        if(!lastCommand)
            return

        // let test = g_ChatHistory[1]; // g_ChatHistory is not defined https://trac.wildfiregames.com/ticket/5387

        caption = lastCommand ;
    }




    // const cmpPlayerManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager);
    // Engine.playerEnt();
    // const numPlayers = cmpPlayerManager.GetNumPlayers();




    // let player = 0;
    // game.get.player.id
    // let playerId = game.get.player.id(playerName);
    // let numberOfSlots = game.get.numberOfSlots(); // game is not defined

    // selfMessage(`numberOfSlots = ${numberOfSlots}`);
    // selfMessage(`g_GameSettings.mapType = ${g_GameSettings.mapType}`); // g_GameSettings not defined

    // lobby.login =
    // playername.multiplayer =
    // const playerName = Engine.ConfigDB_GetValue("user", "playername.multiplayer"); // works
    // selfMessage(`playerName = ${playerName}`); // works
    // selfMessage(`Engine.GetPlayerGUID = ${Engine.GetPlayerGUID()}`); // works

    // selfMessage(`team = ${Engine.player.GetTeam()}`);

    // const playerEnt = cmpPlayerManager.GetPlayerByID(player);
    // Engine.player.GetTeam(); // Engine.player is undefined
    // selfMessage(`team = ${Engine.player.GetTeam()}.`);

    // const playerEnt = Engine.playerEnt();
    // const cmpPlayer = Engine.QueryInterface(playerEnt, IID_Player);
    // const cmpIdentity = Engine.QueryInterface(playerEnt, IID_Identity);
    // cmpPlayer.GetTeam();
    // selfMessage('team = '+ cmpPlayer.GetTeam()); // cmpPlayer is undefined

    const doTabReplacmentWor_gl_hf_gg_wp_stuff = true; // usefull for debugging maybe
    let captionTime1 = '';
    if(doTabReplacmentWor_gl_hf_gg_wp_stuff){
        /*
        erros when i not host:

ERROR: Errors executing script event "Tab"
ERROR: JavaScript error: gui/common/functions_utility~autociv.js line 107
sendMessageGlHfWpU2Gg is not defined
autoCompleteText@gui/common/functions_utility~autociv.js:107:9
ChatInputPanel.prototype.autocomplete@gui/lobby/LobbyPage/Chat/ChatInputPanel~autociv.js:13:21
ERROR: Errors executing script event "Tab"

        */

        if(caption == 'gl' || caption == 'hf'){
            guiObject.caption = 'Have fun!(hf).'; //  and invite your friends
            captionTime1 = caption.toString();
        }
        if(caption == 'gg')
            guiObject.caption = 'Well played(wp)';
        if(caption == 'wp'){
            guiObject.caption = 'Revenge? Again?(re)';
            captionTime1 = caption;
        }
        if(caption == 'u2'){
            guiObject.caption = '';
            captionTime1 = caption;
        }
        if(captionTime1){
            // got error as obser but worked stoff before worked very nice. so let use a try catch or check if its observer:  (se, 23-0618_1531-46)
            try {
                sendMessageGlHfWpU2Gg(captionTime1);
            } catch (error) {
                // not needet to send. its also good to have changed the captio only 23-0618_1532-39
            }
            return; // 23-0618_1452-21 return is needet. otherwise guiObject.caption = ... changes nothing
        }

        // return; // <== ver dangeoous then eventually all other commands dont work
    }

    // selfMessage('caption = ' + caption)
    if(caption == 'j'){
        if (g_linkLongTeam == null) {
            let linkidShort = Date.now().toString().substring(10);
            // not open this link always. if you have it already probably
            g_linkLongTeam = `https://meet.jit.si/0ad${linkidShort}audio`;
            // doOpenJitsiLink = true;
            if(false){ // maybe better not use it at the moment. maybe later. in a future version. to much confusion
                try {
                    openURL(g_linkLongTeam); // its not necesary. if error use /link later
                } catch (error) {

                }
            }
        }
        //   selfMessage(Engine.team[0]); // state is not defined
          caption = g_linkLongTeam;
          const inviteJitsiText =  `Dear Team please open this link for team-audio-chat: ${g_linkLongTeam} . If you have the mod AutoCiv you could open it by writing /link<enter> . Please not everybody create a link.`;
        //   guiObject.caption = '/link'; //  inviteJitsiText;
          guiObject.caption = inviteJitsiText;
        //   sendMessage(`${inviteJitsiText}`); // TODO: it send to all not only to Allied
          return;
    }
    // selfMessage('caption = ' + caption)


    // Engine.ConfigDB_CreateAndSaveValue("user", "autociv.chat.lastCommand", caption); // is not a function error in Version a26 aut 23-0605_1920-25

    const sameTry = autoCompleteText.state.newCaption == caption
    if (sameTry)
    {
        const textBeforeBuffer = autoCompleteText.state.oldCaption.substring(0, autoCompleteText.state.buffer_position)
        const completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
        const newCaptionText = completedText + autoCompleteText.state.oldCaption.substring(autoCompleteText.state.buffer_position)

        autoCompleteText.state.newCaption = newCaptionText

        guiObject.caption = newCaptionText

        ConfigDB_CreateAndSaveValueA26A27("user", "autociv.chat.lastCommand", newCaptionText);

        guiObject.buffer_position = autoCompleteText.state.buffer_position + (completedText.length - textBeforeBuffer.length)
    }
    else
    {
        const buffer_position = guiObject.buffer_position
        autoCompleteText.state.buffer_position = buffer_position
        autoCompleteText.state.oldCaption = caption
        autoCompleteText.state.tries = 0

        const textBeforeBuffer = caption.substring(0, buffer_position)
        const completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
        const newCaptionText = completedText + caption.substring(buffer_position)

        autoCompleteText.state.newCaption = newCaptionText
        ConfigDB_CreateAndSaveValueA26A27("user", "autociv.chat.lastCommand", newCaptionText);

        guiObject.caption = newCaptionText
        guiObject.buffer_position = buffer_position + (completedText.length - textBeforeBuffer.length)
    }
}

// Used to track previous texts from autocompletion to try next autocompletion if multiples apply.
autoCompleteText.state = {
    "buffer_position": 0,
    "newCaption": "",
    "oldCaption": "",
    "tries": 0
}

// Use the JS cache, instead of recomputing the same color
const autociv_ColorsSeenBefore = {};

/**
 * Some text colors must become brighter so that they are readable on dark backgrounds.
 * Modified version from gui/lobby/LobbyPage/PlayerColor.GetPlayerColor
 * Additional check for "perceived brightness", if the color is already bright enough don't change it,
 * otherwise go up in small incremental steps till it is bright enough.
 * https://www.w3.org/TR/AERT/#color-contrast
 * @param   {string}  color                 string of rgb color, e.g. "10 10 190" ("Dark Blue")
 * @param   {number}  brightnessThreshold   Value when a color is considered bright enough; Range:0-255
 * @return  {string}                        string of brighter rgb color, e.g. "100 100 248" ("Blue")
*/
function brightenedColor(color, brightnessThreshold = 110)
{
    // check if a cached version is already available
    let key = `${color} ${brightnessThreshold}`
    if (!autociv_ColorsSeenBefore[key])
    {
        let [r, g, b] = color.split(" ").map(x => +x);
        let i = 0;
        while (r * 0.299 + g * 0.587 + b * 0.114 <= +brightnessThreshold)
        {
            i += 0.001;
            const [h, s, l] = rgbToHsl(r, g, b);
            [r, g, b] = hslToRgb(h, s, l + i);
        }
        autociv_ColorsSeenBefore[key] = [r, g, b].join(" ");
    }
    return autociv_ColorsSeenBefore[key];
}

function ConfigDB_CreateAndSaveValueA26A27(user, key, value){
    // is not a function error in Version a26 aut 23-0605_1920-25
    try {
        Engine.ConfigDB_CreateAndSaveValue(user, key, value); // is not a function error in Version a26 aut 23-0605_1920-25
    } catch (error) { // for A26 or before
        Engine.ConfigDB_CreateValue(user, key, value);
        Engine.ConfigDB_WriteFile(user, "config/user.cfg");
    }
};
