var g_linkLongTeam = null; // init should be available during the game and not changed

var g_lastCommand = "";
// var g_lastCommandID = 0;
var g_lastCommandIDmax = 5;
var g_lastCommandID = parseInt (Engine.ConfigDB_GetValue("user", `autocivP.chat.g_lastCommandID`));
if(isNaN(g_lastCommandID))g_lastCommandID = 0;
// warn('g_lastCommandID = ' + g_lastCommandID); // selfMessage function dont work here



/**
 * @param {*} text - Slice of the text from start to buffer position
 * @param {*} list - List of texts to try to auto-complete
 * @param {*} tries - Number of times to try to autocomplete
 */
tryAutoComplete = function (text, list, tries)
{
    if (!text.length)
        return text

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

// var autoCompleteText_original = function (guiObject, list) // this works without errors
// {
//     const caption = guiObject.caption
//     if (!caption.length)
//         return

//     const sameTry = autoCompleteText.state.newCaption == caption
//     if (sameTry)
//     {
//         const textBeforeBuffer = autoCompleteText.state.oldCaption.substring(0, autoCompleteText.state.buffer_position)
//         const completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
//         const newCaptionText = completedText + autoCompleteText.state.oldCaption.substring(autoCompleteText.state.buffer_position)

//         autoCompleteText.state.newCaption = newCaptionText

//         guiObject.caption = newCaptionText
//         guiObject.buffer_position = autoCompleteText.state.buffer_position + (completedText.length - textBeforeBuffer.length)
//     }
//     else
//     {
//         const buffer_position = guiObject.buffer_position
//         autoCompleteText.state.buffer_position = buffer_position
//         autoCompleteText.state.oldCaption = caption
//         autoCompleteText.state.tries = 0

//         const textBeforeBuffer = caption.substring(0, buffer_position)
//         const completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
//         const newCaptionText = completedText + caption.substring(buffer_position)

//         autoCompleteText.state.newCaption = newCaptionText

//         guiObject.caption = newCaptionText
//         guiObject.buffer_position = buffer_position + (completedText.length - textBeforeBuffer.length)
//     }
// }

var autoCompleteText_newMerge = function (guiObject, list)
{
  // selfMessage('324: autoCompleteText_newMerge')

    chatInputTooltipQuickFixUpdate()

    let caption = guiObject.caption
    // let caption = guiObject.caption.trim()  // used long time to trim the caption to 23-0705_2249-00 idk if it may dangerous to trim here
    if (!caption.length){

        // selfMessage(`repeat you last(id = ${g_lastCommandID}) command:`) // message disabled becouse its also inside the looby. could disturbing a bit.
        let lastCommand;
        if( !isNaN(g_lastCommandID) && g_lastCommandID >= 0 )
            lastCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${g_lastCommandID}`);
        else{
            error('23-0628_0020-57')
            selfMessage(`ERROR: g_lastCommandID = ${g_lastCommandID}`)
        }
        if(!lastCommand)
            return

        if(g_lastCommand == lastCommand){
            // selfMessage(`70: '${lastCommand}' = lastCommand`);
            // warn(`70: '${lastCommand}' = lastCommand`);

            // let nextID = getNextLastCommandID()
            let nextID = g_lastCommandID

            const nextCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${nextID}`);
            if(nextCommand && nextCommand.length){
                g_lastCommand = nextCommand;
                g_lastCommandID = nextID;
            }
            // endoOf g_lastCommand == lastCommand
        }else{
            // g_lastCommand != lastCommand
            // selfMessage(`76: g_lastCommand='${g_lastCommand}' != '${lastCommand}' = lastCommand`);
            g_lastCommand = lastCommand;
            // g_lastCommandID++;
            // if(g_lastCommandID > g_lastCommandIDmax) g_lastCommandID = 0;
        }// endoOf g_lastCommand != lastCommand
        // let test = g_ChatHistory[1]; // g_ChatHistory is not defined https://trac.wildfiregames.com/ticket/5387

        if(g_lastCommand.length)
            caption = g_lastCommand ;
        // End of caption is empty
    }else{
        // caption is not empty
        // selfMessage('TAB and caption is not empty')

        const maxCaptionLengthAllowed = 130 // test crashed by 150
        if(caption.length > maxCaptionLengthAllowed)
        {
            // selfMessage(`max text length > ${maxCaptionLengthAllowed}`)
            // seems this prefent from the error // Retrieve the substring of the last n characters
            // CStr CStr::Right(size_t len) const { ENSURE(len <= length()); return substr(length()-len, len); }
            return
        }

        // selfMessage(`155: ${caption.toLowerCase()} = ${caption}`) //TODO - add to json tab-commands

        if(caption.toLowerCase() == g_lastCommand.toLowerCase()){
          // selfMessage(`158 ${caption.toLowerCase()} = ${caption}`) //TODO - add to json tab-commands

          if(caption.toLowerCase() == "communityModToggle".toLowerCase())
          // "description": translate("toggle cumunity mod."),
          // "handler": () =>
          {
            let modEnabledmods = Engine.ConfigDB_GetValue(
              "user",
              "mod.enabledmods"
            );
            selfMessage(`modEnabledmods = ${modEnabledmods}`);
            if(modEnabledmods.indexOf("community-mod") == -1)
              modEnabledmods += ' community-mod'
            else
              modEnabledmods = modEnabledmods.replace(/\s*\bcommunity-mod\b\s*/, " ")

            ConfigDB_CreateAndSaveValueA26A27("user", "mod.enabledmods", modEnabledmods.trim())
            selfMessage(`modEnabledmods = ${modEnabledmods}`);
            restart0ad()
            // return
        }


            let nextID = getNextLastCommandID()

            // selfMessage(`86: ${g_lastCommandID}' = g_lastCommandID`);
            // selfMessage(`164: nextID = ${nextID}'`);
            let nextCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${nextID}`);

            if( !(nextCommand && nextCommand.length)
                && g_lastCommandID > 0 )
            {
                    nextID = 0
                    nextCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${nextID}`);
                    // selfMessage(`172: nextID = ${nextID}'`);
            }

            if(nextCommand && nextCommand.length){
                g_lastCommand = nextCommand;
                g_lastCommandID = nextID;
                // caption = nextCommand ;
                guiObject.caption = nextCommand; // use of guiObject.caption not caption solved a seldom critical crash
                return;
            }else{
                selfMessage('never heppens? 23-0628_1307-15')
            }
            // selfMessage(`caption == g_lastCommand '${caption}' => double tab ?`);
            // EndOf caption == g_lastCommand

        }

        ConfigDB_CreateAndSaveValueA26A27("user", `autocivP.chat.g_lastCommandID`, g_lastCommandID); // !! dont deltete !! if delte also /p profilles dont get storede into the config file 23-0628_1338-23
        // selfMessage(`g_lastCommand = ${g_lastCommand}`)
        // Enof caption is not empty
    }

    // selfMessage(`216: ${caption.toLowerCase()} = ${caption}`) //TODO - add to json tab-commands


    // Enof caption is maybe not empty
    const doTabReplacmentWor_gl_hf_gg_wp_stuff = true; // usefull for debugging maybe




    if(caption.length ){
      const key = "autocivP.chat.iconPrefix";
      const iconPrefix = Engine.ConfigDB_GetValue("user", key); // icon prefix iconPrefix should be default <
      let firstChar = caption.toString().charAt(0); // or str[0]


      if(  doTabReplacmentWor_gl_hf_gg_wp_stuff
        &&
        (
        caption.length > 1 // prevent conflict with seldon username
        ||
        !firstChar.match(/[a-z]/i)
        )
        &&
        (
        caption.length <= 20 //NOTE - 30 maybe too long . prefent multiple repacment
        || guiObject.buffer_position > 14 // maybe user want gg wp replacments in a longer text and cursor is in the middle or at the end
        )
        &&

       ( !iconPrefix.length && firstChar != '/'
        ||
         firstChar == iconPrefix)
       ){
        const captionBegin = caption.toString()
        const captionTrimed = captionBegin.substring(iconPrefix.length)
        // selfMessage('first char = ' + firstChar)
        // selfMessage('iconPrefix = ' + iconPrefix)
        // selfMessage('iconPrefix.length = ' + iconPrefix.length)
        // selfMessage('244: captionTrimed = ' + captionTrimed)

        // let text = captionBegin.substring(1); // or text.slice(1)
        // selfMessage('caption length = ' + captionBegin.length);
        // communityModToggle = 19
        let minMatchScore = (captionTrimed.length > 20) ? 0.8 : (iconPrefix.length ? 0.3 :  0.55 ) // user name will be replaced later. i want have .3 but some users dont be found so easy ... hmmm
        // sendMessage(`248: minMatchScore = ${minMatchScore}`)


        // sendMessage(`minMatchScore = ${minMatchScore}`)
        // sendMessage(`guiObject.buffer_position = ${guiObject.buffer_position}`)



        // no error seeing no translation here:
        // let allIconsInText = translate( transGGWP_markedStrings_I(captionTrimed, minMatchScore) )


        // selfMessage(`258: captionTrimed = ${captionTrimed}`)

        // no error seeing no translation here:
        let allIconsInText =  Engine.Translate( transGGWP_markedStrings_I(captionTrimed, minMatchScore) )


        // const regex = /\b(\w+)\b/g;
        // let allIconsInText = captionTrimed.replace(regex, match => {
        //   const translated = translateGlHfWpU2Gg(match,minMatchScore)
        //   return translated !== null ? translated : match;
        // });

        //



        // selfMessage('allIconsInText = ' + allIconsInText);
        // guiObject.caption = allIconsInText;
        // return
        try {

          let guiObject = Engine.GetGUIObjectByName("chatInput");
          // guiObject.blur(); // remove the focus from a GUI element.
          guiObject.focus();

          // caption = allIconsInText
          // selfMessage('230: allIconsInText = ' + allIconsInText);
          if(captionBegin != allIconsInText){
            const isCaptionNumeric = (allIconsInText[0] >= '0' && allIconsInText[0] <= '9')
            if(isCaptionNumeric)
              allIconsInText = '  ' + allIconsInText // add two spaces to the beginning so user can easily change the number to and add later maybe a name (ping user) at the very beginning
            guiObject.caption = allIconsInText // this prefent crash of the game when press backspace. becouse focus of the guiObject was lost without this
            // selfMessage('234: captionBegin != allIconsInText = ' + captionBegin + ' != ' + allIconsInText);
            if (isCaptionNumeric)
              guiObject.buffer_position = 2 // sets the buffer/corsor position to the beginning
            else
              guiObject.buffer_position = allIconsInText.length
            return // this return was maybe missing 23-0705_2302-57 without this return some crases happened in oberver mode !!!!!! 23-0705_2305-59
          }
        }catch (error) {

          if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
            warn(error.message)
            warn(error.stack)
          }


        }

            // text = translateGlHfWpU2Gg(caption.toString());
            // if(text.length){
            //     saveLastCommand2History(captionBegin)
            //     guiObject.caption = text;
            //     // selfMessage('always ?') // no not always. works like expected 23-0628_0232-14
            //     return;
            // }


        }
    }
        // "Select chat addressee." "Everyone"=0 "Allies"=1 Enemies=2 Observers=3
    const chatAddressBox = Engine.GetGUIObjectByName("chatAddressee"); // found this name in binaries/data/mods/public/gui/session/chat/chat_window.xml



    if(caption == 'j' ){
        if(gameState != "ingame" || chatAddressBox.selected != 1){ // 1 is Allies
            let text = `to use jiti in you team: 1. open Ally-Chat 2. write j⟦Tab⟧ then enter. 3. write li⟦Tab⟧ or /link`
            selfMessage(text)
            return
        }

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
          const inviteJitsiText =  `Please open following link for team-audio-chat in your web browser. type li⟦Tab⟧ or /link<enter>. Only a web browser is required. ${g_linkLongTeam} `;
        //   guiObject.caption = '/link'; //  inviteJitsiText;
          guiObject.caption = inviteJitsiText;
        //   sendMessage(`${inviteJitsiText}`); // TODO: it send to all not only to Allied

        // selfMessage(g_linkLongTeam); // its only a selfMessage. not read by botManager
        // BotManager.openURL(g_linkLongTeam); // is not a function
        // let err = botManager.openLink(g_linkLongTeam); // is not a function


        // botManager.setMessageInterface("ingame");
        // let err = botManager.get("link").openLink(g_linkLongTeam); // this get the link from the chat.
        // if (err)
        //     selfMessage(err);

        return;
    }
    if(caption == 'li'){
        guiObject.caption = '/link';
        return;
    }
    if(caption == 'whatsAutocivPMod'){
        guiObject.caption = whatsAutocivPMod;
        return;
    }






    // selfMessage('caption.toLowerCase() = ' + caption.toLowerCase());

    if(caption.toLowerCase() == 'hiall'){
        const key = "autocivP.gamesetup.helloAll";
        const helloAll = Engine.ConfigDB_GetValue("user", key);
        if(!helloAll)
            selfMessage('helloAll is empty.');
        guiObject.caption = helloAll
        selfMessage('set /hiAll yourWelcomeText or use /hiAll yourWelcomeText or send by /hiAll or helloAll tab, to edit it first.');
        return;
    }
    if(caption.toLowerCase() == 'modsImCurrentlyUsing'.toLowerCase()){
        const modEnabledmods = Engine.ConfigDB_GetValue(
          "user",
          "mod.enabledmods"
        );
        // sendMessage(`Mods I'm currently using: ${modEnabledmods.slice(11,)}` );
        let text = `Mods I'm currently using: ${modEnabledmods.slice(11,)}`
        text = text.replace('autocivP', 'autocivP❧♣▦▣') //  ♡ autocivP❧♣▦▣ mod
        guiObject.caption = text;
        return;
    }
    // selfMessage('caption = ' + caption)
    // Engine.ConfigDB_CreateAndSaveValue("user", "autocivP.chat.lastCommand", caption); // is not a function error in Version a26 aut 23-0605_1920-25
    const sameTry = autoCompleteText.state.newCaption == caption
    if (sameTry)
    {

        // selfMessage(282)
        const textBeforeBuffer = autoCompleteText.state.oldCaption.substring(0, autoCompleteText.state.buffer_position)
        // selfMessage(284)
        const completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
        // selfMessage(286)
        const newCaptionText = completedText + autoCompleteText.state.oldCaption.substring(autoCompleteText.state.buffer_position)
        // selfMessage(288)

        autoCompleteText.state.newCaption = newCaptionText



      try {
          guiObject.caption = newCaptionText
          guiObject.focus()
        }catch (error) {
          if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
            warn(error.message)
            warn(error.stack)
          }
      }




        // ConfigDB_CreateAndSaveValueA26A27("user", "autocivP.chat.lastCommand", newCaptionText);
        try {
            saveLastCommand2History(newCaptionText);
        } catch (error) {
            // happens in the lobby console when double press tab 23-0622_2013-26
            if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
              error('double pressed tab to fast?')
              warn(error.message)
              warn(error.stack)
            }

        }
        // selfMessage(295)
        guiObject.buffer_position = autoCompleteText.state.buffer_position + (completedText.length - textBeforeBuffer.length)
        // selfMessage(297)
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

        // selfMessage('324');

      try{
        guiObject.caption = newCaptionText
        // selfMessage('326');
        guiObject.focus();
        guiObject.buffer_position = buffer_position + (completedText.length - textBeforeBuffer.length)
      }catch (error) {
        if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
          warn(error.message)
          warn(error.stack)
        }
  }


        // selfMessage('328');
    }
}

// autoCompleteText = autoCompleteText_original
autoCompleteText = autoCompleteText_newMerge


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

function ConfigDB_CreateAndSaveValueA26A27(user, key, value, isEmptyAvalueAllowed = false){

    // ConfigDB_CreateAndSaveValue is not a function error in Version a26 but in a27 23-0605_1920-25
    if(!user || !key || ( !isEmptyAvalueAllowed && value.length <= 0 ) ){
        // error('23-0625_0609-52');
        warn(`!user=${user} || !key=${key} || !value=${value}`)
        return false;
    }

    if(versionOf0ad != '0.0.26')
        Engine.ConfigDB_CreateAndSaveValue(user, key.toString(), value.toString()); // maybe 0.0.26 or higher
    else{
        Engine.ConfigDB_CreateValue(user, key, value);
        Engine.ConfigDB_WriteFile(user, "config/user.cfg");
    }
    return

    // try {
    //     Engine.ConfigDB_CreateAndSaveValue(user, key.toString(), value.toString());
    // } catch (error) {
    //     Engine.ConfigDB_CreateValue(user, key, value);
    //     Engine.ConfigDB_WriteFile(user, "config/user.cfg");
    // }
};









function saveThisModProfile(nr, autoLabelManually) {
    const modsFromUserCfg_const = Engine.ConfigDB_GetValue(
      "user",
      "mod.enabledmods"
    );
    const name = "modProfile.p" + nr;
    const isEmptyAvalueAllowed = true
    const modProfile = Engine.ConfigDB_GetValue("user", name);
    const nameLabel = "modProfile.p" + nr + "label";

    // warn("check if ModProfiles has changed")

    const modProfile_alwaysIn_Key = 'modProfile.alwaysIn'
    const modProfile_alwaysIn_Default = 'LocalRatings feldmap'
    const mo = Engine.ConfigDB_GetValue("user", );
    if(!mo)
      ConfigDB_CreateAndSaveValueA26A27("user", modProfile_alwaysIn_Key, modProfile_alwaysIn_Default)

    const alwaysInReplayDefaultsKey = 'modProfile.alwaysInReplay'
    const alwaysInReplayDefaults = 'boonGUI'
    const modProfilealwaysInReplay = Engine.ConfigDB_GetValue("user", );
    if(!modProfilealwaysInReplay)
      ConfigDB_CreateAndSaveValueA26A27("user", alwaysInReplayDefaultsKey, alwaysInReplayDefaults)

    if (!modProfile) { // add defaults
      // warn("133")
      let clean = "";
      switch (nr) {
        case 0: // p0
          clean = modsFromUserCfg_const.replaceAll(/[^\w\d\-]+/g, " ");
          break;
        case 1:
          clean = "proGUI";
          break;
        case 2:
          clean = "community-mod proGUI";
          break;
        case 3:
          clean = "boonGUI";
          break;
        case 4:
          clean = "community-maps-2 kush-extreme 10ad";
          break;
        case 5:
          clean = "mainland-twilight";
          break;
        default:
            error('should no happen');
            break;
      }

      ConfigDB_CreateAndSaveValueA26A27("user", name,clean, isEmptyAvalueAllowed)

      const cleanLabel = clean.replaceAll(/([^ ]{3})[^ ]+/g, "$1");
      ConfigDB_CreateAndSaveValueA26A27("user", nameLabel,cleanLabel, isEmptyAvalueAllowed)

    } else {
      let clean = modProfile.replaceAll(/[^\w\d\-]+/g, " ");

      const showDebugWarning = false
      if (clean != modProfile) {
        // correct profile if necesarry
        ConfigDB_CreateAndSaveValueA26A27("user", name,clean, isEmptyAvalueAllowed)
        if(showDebugWarning)warn("modProfile.p" + nr + " saved with =" + clean + "=");
      }
      if (!autoLabelManually) {
        const cleanLabel = clean.replaceAll(/([^ ]{3})[^ ]+/g, "$1");
        ConfigDB_CreateAndSaveValueA26A27("user", nameLabel,cleanLabel, isEmptyAvalueAllowed)
        if(showDebugWarning)warn("autoLabel" + nr + " saved with =" + cleanLabel + "=");
      }
    }
  }
  function enableThisModProfile(nr) {
    if (
      Engine.ConfigDB_GetValue("user", "modProfile.p" + nr + "enabled") == "true"
    ) {
      const modsFromUserCfg_const = Engine.ConfigDB_GetValue(
        "user",
        "mod.enabledmods"
      );
      const profKey = "modProfile.p" + nr;
      const modProfile = Engine.ConfigDB_GetValue("user", profKey);
      let clean = '';



      clean =
        "mod public " +
        modProfile.replaceAll(/\b(mod\s+public)\b\s*/g, "")

        clean = addModProfileAlwaysInAlsoAddAutocivPatTheEnd(clean)


      if (clean != modsFromUserCfg_const) {
        warn("save:" + nr);
        warn(clean);

        // function RestartEngine(): any;

        warn(clean);
        warn("is enabled next when 0ad is started.");
        // warn(modsFromUserCfg_const);
        // warn("_____________________");
        // Engine.ConfigDB_WriteValueToFile(
        //   "user",
        //   "modProfile.restartNext",
        //   "true",
        //   "config/user.cfg"
        // );

        ConfigDB_CreateAndSaveValueA26A27("user", "modProfile.backup",modsFromUserCfg_const)
        ConfigDB_CreateAndSaveValueA26A27("user", "mod.enabledmods",clean)
        // Engine.SetMods(clean) // get error: Engine.SetMods is not a function

        // return true;
        // state.needsRestart = true;
        // configSaveToMemoryAndToDisk(key, settings[key]);

        // Engine.SetMods(clean); // SetMods is not a function here :(
        // Engine.RestartEngine(); // RestartEngine(1);  is not a function here :(

        // state.reasons.add("New mode-profile settings added.");

        // Engine.RestartInAtlas(1) // works. it start atlas ... 23-0703_1555-52 dont like it

        // Engine.RestartInEngine(1) // is not a function
        // Engine.RestartEngine(1) // is not a funtion
        // Engine.RestartEngine.call(1) // is undefined


        // Engine.SetMods()


        // function GetAvailableMods(): any
        // function RestartEngine(): any
        // function SetMods(): any
        // function ModIoStartGetGameId(): any
        // function ModIoStartListMods(): any
        // function ModIoStartDownloadMod(): any
        // function ModIoAdvanceRequest(): any
        // function ModIoCancelRequest(): any
        // function ModIoGetMods(): any



        // let message = `
        // Mods changed
        // Restart Engine ?`;
        //     messageBox(
        //       500,
        //       300,
        //       message,
        //       "AutoCivP mod autoOrderFix notice",
        //       ["Ok, change", "No"],
        //       [
        //         () => {
        //           Engine.Restart(1) // works
        //         },
        //         () => {},
        //       ]
        //     );
          // try {


            const key = "autocivP.gamesetup.restart";
            ConfigDB_CreateAndSaveValueA26A27("user", key, 'restart');
            Engine.SwitchGuiPage("page_pregame.xml");


            // Engine.Restart(1) // works sometimes Engine. and sometimes: Restart is not a function
          // } catch (error) {
          //   warn(error.message)
          //   warn(error.stack)
          //   warn('well done. Please start 0ad now again.')
          //   Engine.Exit(1) // works
          // }

        // Engine.Exit(1) // works

      } else {
        // warn("dont save " + nr);
      }
      return true;
    }
    return false;
  }

  function check_modProfileSelector_settings() {
    const autoLabelManually = Engine.ConfigDB_GetValue("user", "modProfile.autoLabelManually") === "true";

    [...Array(6)].forEach((_, k0_5) => saveThisModProfile(k0_5, autoLabelManually));

    for (let k0_5 = 0; k0_5 <= 5; k0_5++) {
      const nameOfCheckBox = "modProfile.p" + k0_5 + "enabled";
      if (Engine.ConfigDB_GetValue("user", nameOfCheckBox) === "true") {
        if (enableThisModProfile(k0_5)) {
          warn(`${k0_5} was enabled as your default mod-configuration.`);
          ConfigDB_CreateAndSaveValueA26A27("user", nameOfCheckBox, "false");
          warn(`${k0_5} checkBox disabled (if enabled have conflict with the normal mod selector)`);
          return true;
        }
        break;
      }
    }

    return false;
  }


// function addModProfileAlwaysInAlsoAddAutocivPatTheEnd(clean){
//   const modProfileAlwaysIn = Engine.ConfigDB_GetValue("user", 'modProfile.alwaysIn');
//   const modProfileAlwaysInArray = modProfileAlwaysIn.split(/\s/);
//   modProfileAlwaysInArray.forEach(value => {
//     const regex = new RegExp('\b' + value + '\b\s*' ,'gi');
//     clean = clean.replaceAll(regex, ""); // mod\s+public is default. boring to save it
//   })
//   // autocivP its at the end and shoud at the end
//   if(clean.indexOf(' autocivP')<=0)
//     clean += ' autocivP'
//   clean = clean.replaceAll('autocivP', `${modProfileAlwaysIn} autocivP` ); // mod\s+public is default. boring to save it
//   return clean
// }

function addModProfileAlwaysInAlsoAddAutocivPatTheEnd(clean) {
  const modProfileAlwaysIn = Engine.ConfigDB_GetValue("user", 'modProfile.alwaysIn');
  const modProfileAlwaysInArray = modProfileAlwaysIn.split(/\s/);

  modProfileAlwaysInArray.forEach(value => {
    const regexPattern = new RegExp('\b' + value + '\b\s*' ,'gi');
    const regex = new RegExp(regexPattern, 'gi');
    clean = clean.replaceAll(regex, "");
  });

  if (!clean.includes(' autocivP'))
    clean += ' autocivP';

  return clean.replaceAll('autocivP', `${modProfileAlwaysIn} autocivP`);
}


function restart0ad()
{
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
