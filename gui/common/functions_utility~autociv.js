var g_linkLongTeam = null; // init should be available during the game and not changed

var g_lastCommand = "";
// var g_lastCommandID = 0;
var g_lastCommandIDmax = 5;
var g_lastCommandID = parseInt (Engine.ConfigDB_GetValue("user", `autocivP.chat.g_lastCommandID`));


var g_iconPrefix = Engine.ConfigDB_GetValue("user", "autocivP.chat.iconPrefix").trim(); // icon prefix iconPrefix should be default <

// warn(`g_iconPrefix = >${g_iconPrefix}<`);

var g_previousCaption = ''

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


/**
 * @param {Object} guiObject - the GUI object
 * @param {Array} list - the list of items
 * @return {undefined} - no return value
 */
const g_autoCompleteText_newMerge = (guiObject, list) => {
  // selfMessage('100: autoCompleteText_newMerge')
  // selfMessage('101: caption.length = ' + guiObject.caption.length)

  chatInputTooltipQuickFixUpdate()

    // warn(`22: last text was >${g_textSuggestedInEmptyChatWhenTabPressed}<`);

  const caption = guiObject.caption
  // let caption = guiObject.caption.trim()  // used long time to trim the caption to 23-0705_2249-00 idk if it may dangerous to trim here

  let bugIt = false // new implementation so i will watch longer
	// bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer



  if(bugIt)
    selfMessage(`127: ${caption.toLowerCase()} = ${caption}      gui/common/functions_utility~autociv.js`) //TODO - add to json tab-commands


  // End of caption is maybe not empty

  // if(!caption) // trigers when no caption content is in
  if (!caption.length){ // trigers when no caption content is in
    if(bugIt)
      selfMessage(`135: ${caption} = ${caption} gui/common/functions_utility~autociv.js`)

    if( g_textSuggestedInEmptyChatWhenTabPressed.length > 0 ) // this fixes the problem with changing chat context via hotkey a bit. it saves last chat context temporarily and but it in again when you press tab 23-0724_1543-57
    {
      if(bugIt){
        const debugMsg = `139: g_textSuggestedInEmptyChatWhenTabPressed = ${g_textSuggestedInEmptyChatWhenTabPressed}   gui/common/functions_utility~autociv.js`
        selfMessage(debugMsg)
      }

      if(gameState == 'ingame'){
        // in this state we want super careful
        guiObject.caption = truncateString( g_textSuggestedInEmptyChatWhenTabPressed.trim(), 80 )
        guiObject.buffer_position = 0
      }else{
        guiObject.caption = g_textSuggestedInEmptyChatWhenTabPressed.trim()
        guiObject.buffer_position = 0
      }
      g_textSuggestedInEmptyChatWhenTabPressed = ''
      g_textSuggestedInEmptyChatWhenTabPressed_lines = 0
      g_previousCaption = guiObject.caption
      return
    }

    if(setCaption2LastCommandOfHistory(guiObject)){
      g_previousCaption = guiObject.caption
      return // now the caption is not empty anymore
    }
  }


  // selfMessage(`122:  '${g_lastCommand}' `);


  if(caption?.length ){

    if(g_previousCaption == 'communityModToggle'){
      if(bugIt)
        selfMessage(`164: now now now   gui/common/functions_utility~autociv.js `);
        captionCheck_is_communityModToggle_optional_restartOad(caption, true)
    }

    if(captionCheck_is_communityModToggle_optional_restartOad(caption, false)){
      if(bugIt)
        selfMessage(`211: communitymodtoggle  gui/common/functions_utility~autociv.js `);

      g_previousCaption = 'communityModToggle' // next time it should be restart then and do the chanches
      guiObject.caption = 'communityModToggle' // for some reason that i dont understand must be now lowercase not communityModToggle
      return
    }

    if(g_textSuggestedInEmptyChatWhenTabPressed){
      const match = caption.toLowerCase().match(/msg(\d+)/);
      if (match) {
        saveLastCommand2History(caption)
        const number = match[1];
        // Handle the extracted number
        // selfMessage('gui/common/functions_utility~autociv.js ' + lineNumber())
        const linesArray = g_textSuggestedInEmptyChatWhenTabPressed.trim().split('\n');
        const lastLines = linesArray.slice(-number);
        const lastLinesString = lastLines.join('\n');
        guiObject.caption = lastLinesString
        g_previousCaption = guiObject.caption
        guiObject.buffer_position = 0 //  lastLinesString.length;

        ConfigDB_CreateAndSaveValueA26A27("user", "autocivP.chat.copyAllChatMessages", "true"); // if want select messages from all you net th have all chat messages first/next. => so set the flag to true

    return
      }
    }

    switch (caption.toLowerCase()) {

        // return captionIs_j(guiObject);
      case 'j':
          return captionIs_j(guiObject);
      case 'li':
          guiObject.caption = '/link';
          return;
      case 'whatsAutocivPMod'.toLowerCase():
          guiObject.caption = whatsAutocivPMod;
          return;
      case 'whatsCommunityMod'.toLowerCase():
          guiObject.caption = whatsCommunityMod;
          return;
      case 'legend'.toLowerCase():
          guiObject.caption = `legend: ★ proGUI mod, ♇ autocivP mod`
          return;
      case '/legend'.toLowerCase():
          guiObject.caption = `legend: ★ proGUI mod, ♇ autocivP mod`
          return;
      case 'hiall':
          return captionIs_hiall(guiObject);
      case 'me':
          return captionIs_me(guiObject);
      case 'meurl':
          return captionIs_meURL(guiObject);
      case 'meu': // synonym. if you in hurry
          return captionIs_meURL(guiObject);
      case 'modsImCurrentlyUsing'.toLowerCase():
        return captionIs_modsImCurrentlyUsing(guiObject);
        // selfMessage('caption.toLowerCase() = ' + caption.toLowerCase());
      case 'timeNow'.toLowerCase():
        // selfMessage('162: caption.toLowerCase() = ' + caption.toLowerCase());
        /*!SECTION
        todo: this is not working in lobby. needs implementd again
        JavaScript error:
        gui/common/functions_utility~autociv.js line 163
        g_NetworkCommands['/whatstimeNow'] is not a function
        */
        try {
          return g_NetworkCommands["/whatstimeNow"]()
        } catch (error) {
          selfMessage('inside lobby whatstimeNow is not a function, at the moment. and there is no will to fix it at the moment ;) Motivate me. its not so very importand command. other stuff is fine.');
          if(g_selfNick =="seeh"){ //NOTE -  developers want to see the error in the console
            warn(error.message)
            warn(error.stack)
          }
          return
        }
      return

    } // switch end

    const firstChar = caption.toString().charAt(0); // or str[0]

    // selfMessage(`203: doppelPosting? '${g_lastCommand}' `);
    // selfMessage(`126: g_lastCommand = '${g_lastCommand}' , caption = '${caption}' `);

    if(bugIt)
      selfMessage(`${ln()}: '${g_previousCaption}' ?= '${caption}'  gui/common/functions_utility~autociv.js `);

    if(g_previousCaption == caption){ // g_lastCommand
      // selfMessage(`207: doppelPosting? '${g_lastCommand}' gui/common/functions_utility~autociv.js `);

      const firstChar = caption.charAt(0); // or str[0]
      if(firstChar.match(/[‹›]/) ){
        g_previousCaption = caption
        return remove_delimiters_from_chat_icon_message(guiObject, caption);

      }

      if(bugIt)
        selfMessage(`${ln()}: doppelPosting? '${g_lastCommand}' | captionCheck_is_communityModToggle_optional_restartOad |  gui/common/functions_utility~autociv.js `);
      captionCheck_is_communityModToggle_optional_restartOad(caption, true) // if is communitymodtoggle restart

      if(bugIt)
        selfMessage(`${ln()}: tries = ${autoCompleteText.state.tries} |  gui/common/functions_utility~autociv.js `);


      if(autoCompleteText.state.tries !=1 && setCaption2nextCommandOfHistory(guiObject)){
        g_previousCaption = caption
        return
      }
    } // end of doppelPosting


    // const textBeforeBuffer = autoCompleteText.state.oldCaption.substring(0, autoCompleteText.state.buffer_position)
    // const textBeforeBuffer = guiObject.caption



  // selfMessage('caption = ' + caption)
  // Engine.ConfigDB_CreateAndSaveValue("user", "autocivP.chat.lastCommand", caption); // is not a function error in Version a26 aut 23-0605_1920-25
  const sameTry = ( autoCompleteText.state.newCaption == caption )
  if (sameTry){

    if(bugIt)    selfMessage(`autoCompleteText.state.tries = ${autoCompleteText.state.tries} ${ln()}`);


    if(autoCompleteText_sameTry_eg_userName_civName(guiObject, list)){
      return // such result should not be saved in the command history. therefore return
    }else{
      if(bugIt)
        selfMessage(`232: doppelPosting? '${g_lastCommand}' gui/common/functions_utility~autociv.js `);
        g_previousCaption = guiObject.caption

    }

  }else{
    if(bugIt)
      selfMessage(`247:  gui/common/functions_utility~autociv.js `);

    if(autoCompleteText_firstTry_eg_userName_civName(guiObject, caption, list)){
      g_previousCaption = guiObject.caption
      return // such result should not be saved in the command history. therefore return
    }
    g_previousCaption = guiObject.caption

  }



    if( is_transGGWP_needet( caption, firstChar, g_iconPrefix,guiObject) )  {
      const captionBegin = caption.toString()
      let captionTrimed = captionBegin.substring(g_iconPrefix.length)
      const minMatchScore = (captionTrimed.length > 20) ? 0.8 : (g_iconPrefix.length ? 0.3 :  0.55 ) // user name will be replaced later. i want have .3 but some users dont be found so easy ... hmmm // user name will be replaced later. i want have .3 but some users dont be found so easy ... hmmm // user name will be replaced later. i want have .3 but some users dont be found so easy ... hmmm

      // selfMessage(`220: gameState '${gameState}' `);
      if(gameState == "ingame"){
       // Help me ☞here
       const pattern = /^help\b/i;
       const hasPattern = pattern.test(guiObject.caption);
       if(hasPattern){
        //  selfMessage(`204: gameState '${gameState}' `);
         captionTrimed = 'helpme' // ingame ist much more importand when help pings other team players then list all the commands via the /help command. more important to have a easy comunication with team. make sure that thiy keyword is still i the json file
       }
     }

      // let allIconsInText =  Engine.Translate( transGGWP_markedStrings_I(captionTrimed, minMatchScore) )
      let allIconsInText =  transGGWP_markedStrings_I(captionTrimed, minMatchScore)

      const key = "autocivP.chat.no_icon_delimiters";
      const no_icon_delimiters = ( Engine.ConfigDB_GetValue("user", key) === "true" )
      if( no_icon_delimiters )
        allIconsInText = remove_delimiters_from_chat_icon_message(guiObject, allIconsInText);


      try {
        const guiObject = Engine.GetGUIObjectByName("chatInput");
        // guiObject.blur(); // remove the focus from a GUI element.
        guiObject.focus();
        // selfMessage('230: allIconsInText = ' + allIconsInText);

        if(captionBegin != allIconsInText){
          const isCaptionNumeric = (allIconsInText[0] >= '0' && allIconsInText[0] <= '9')
          if(isCaptionNumeric)
            allIconsInText = `  ${allIconsInText}`
            // add two spaces to the beginning so user can easily change the number to and add later maybe a name (ping user) at the very beginning

          if(gameState != "ingame"){ // prefent for unwanted replacments for e.g. in gamesetup
            // 90 metal please
            const pattern = /\d+ \w+ please/;
            const hasPattern = pattern.test(allIconsInText);
            if(hasPattern){
              // selfMessage(`287: gameState '${gameState}' `);
              return
            }
          }

          g_previousCaption = captionTrimed
          guiObject.caption = allIconsInText

          guiObject.buffer_position = isCaptionNumeric ? 2 : allIconsInText.length;

          // sets the buffer/corsor position to the beginning

          if(gameState == "ingame"){
            const pattern = /\d+ \w+ please/;
            const hasPattern = pattern.test(allIconsInText);
            if(hasPattern)
             guiObject.buffer_position = 2 // set cursor to beginning of this(btw there a spaces before): 90 food please
          }

          if( true ){
            // ‹away from keyboard
            // selfMessage(`264: away from keyboard`)
            const pattern = /away from keyboard/;
            const hasPattern = pattern.test(allIconsInText);
            if(hasPattern){
             guiObject.buffer_position = (no_icon_delimiters) ? 20 : 21 // set cursor to beginning of this(btw there a spaces before): 90 food please
            }
          }

          // g_lastCommand = allIconsInText
          // saveLastCommand2History(captionTrimed) // not everything should be saved. only the important commands. not all chat content

          // if(setCaption2nextCommandOfHistory(guiObject)){
          //   g_previousCaption = guiObject.caption
          //   return
          // }


          return // this return was maybe missing 23-0705_2302-57 without this return some crases happened in oberver mode !!!!!! 23-0705_2305-59
        }
      }catch (error) {

        if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
          warn('290: ' + error.message)
          warn('291: ' + error.stack)
        }
      }
    }
    // if(g_lastCommand == caption){
    //   selfMessage(`180: doppelPosting? '${g_lastCommand}' `);
    //   setCaption2nextCommandOfHistory(guiObject)
    // }
    if(g_previousCaption == caption ){ // || g_lastCommand == caption
      // selfMessage(`183: doppelPosting? '${g_lastCommand}' `);
      if(setCaption2nextCommandOfHistory(guiObject)){

        g_previousCaption = guiObject.caption
        // setCaption2nextCommandOfHistory(guiObject)

        return
      }
    }

  }

  // try test send flare. dont work
  // let minimapPanel = Engine.GetGUIObjectByName("minimapPanel")
  // minimapPanel.children[2].focus();
  // let objName = 'flar'
  // selfMessage(`204: ${objName} = ${objName}`)

  g_previousCaption = caption


};


/**
 * Auto completes the text AGAIN in the given GUI object using the provided list of options.
 *
 * @param {object} guiObject - The GUI object to autocomplete the text in.
 * @param {array} list - The list of options to use for autocompletion.
 */
function autoCompleteText_sameTry_eg_userName_civName(guiObject, list)
{

  let bugIt = false // new implementation so i will watch longer
  bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer

  const textBeforeBuffer = autoCompleteText.state.oldCaption.substring(0, autoCompleteText.state.buffer_position)
  const completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
  const newCaptionText = completedText + autoCompleteText.state.oldCaption.substring(autoCompleteText.state.buffer_position)
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
    // saveLastCommand2History(newCaptionText);     // not everything should be saved. only the important commands. not all chat content
  } catch (error) {
    // happens in the lobby console when double press tab 23-0622_2013-26
    if(bugIt){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
      error('double pressed tab to fast?')
      warn(error.message)
      warn(error.stack)
    }
  }

  if(guiObject.caption.charAt(0) !== '/') {  // if you want toggle through the / commands it should be different from the the behavior wen you pink somebody
    if(bugIt)
      selfMessage(`${ln()}: textBeforeBuffer = '${textBeforeBuffer}' gui/common/functions_utility~autociv.js`)
    guiObject.buffer_position = autoCompleteText.state.buffer_position + (completedText.length - textBeforeBuffer.length)
  }

  if(textBeforeBuffer != completedText ){ // || g_lastCommand == caption
    // warn(`370: true`)
    return true
  }
  return false
}


/**
 * Auto complete a given text like userName, civName in a user interface field.
 *
 * @param {Object} guiObject - the GUI object representing the user interface field.
 * @param {string} caption - the current caption of the user interface field.
 * @param {Array} list - the list of possible auto complete options.
 * @return {boolean} true if the auto complete was successful, false otherwise.
 */
function autoCompleteText_firstTry_eg_userName_civName(guiObject, caption, list)
{
  let bugIt = false // new implementation so i will watch longer
  // bugIt = true &&  g_selfNick.includes("seeh") // new implementation so i will watch longer

  const buffer_position = guiObject.buffer_position
  autoCompleteText.state.buffer_position = buffer_position
  autoCompleteText.state.oldCaption = caption
  autoCompleteText.state.tries = 0

  const textBeforeBuffer = caption.substring(0, buffer_position)
  if(bugIt){
    selfMessage(`${ln()}: \n\n gui/common/functions_utility~autociv.js`);
    selfMessage(`${ln()}: textBeforeBuffer = ${textBeforeBuffer}`);
  }
  let completedText = tryAutoComplete(textBeforeBuffer, list, autoCompleteText.state.tries++)
  if(caption.charAt(0) !== '/') {
    const usernamePattern = /^[\S]+\s\([^()]*\)/i;
    // const username = "seeh (1205)";

    if (usernamePattern.test(completedText))
      completedText += ' ' // e.g. username ith a space helps to fast write next text

  }

  const newCaptionText = completedText + caption.substring(buffer_position)



  autoCompleteText.state.newCaption = newCaptionText

  if(bugIt){
    selfMessage(`${ln()}: completedText = ${completedText}`);
    selfMessage(`${ln()}: tries = ${autoCompleteText.state.tries}`);
    selfMessage(`${ln()}: newCaptionText = ${newCaptionText}`);
    selfMessage(`${ln()}: completedText = ${completedText}`);
  }

  try{
    guiObject.caption = newCaptionText
    guiObject.focus();

    if(caption.charAt(0) === '/') {
      if(bugIt)      selfMessage(`${ln()}: -----------------------------------------`)
      // asumption that are slash commands maybe you want toggle through them
      // guiObject.buffer_position = (textBeforeBuffer.length)
    }else{
      if(bugIt)      selfMessage(`${ln()}: =========================================`)
      // if you want ping a user the cursor should be later at the end
      guiObject.buffer_position = buffer_position + (completedText.length - textBeforeBuffer.length)
    }

    if(bugIt){
      selfMessage(`${ln()}: buffer_position = ${guiObject.buffer_position}`);
      selfMessage(`${ln()}: textBeforeBuffer = ${textBeforeBuffer}`);
    }

    if(textBeforeBuffer != completedText ){ // || g_lastCommand == caption
      return true
    }

  }catch (error) {
    if(g_selfNick =="seeh"){ //NOTE - 23-0705_2302-57 developers want to see the error in the console
      warn('396' + error.message)
      warn('397' + error.stack)
    }
  }
  return false
}

/*!SECTION
autoCompleteText cannot renamed in:
gui/common/functions_utility~autociv.js line 431
becouse then you get a error:
assignment to undeclared variable g_autoCompleteText
==> its defined in external
*/
autoCompleteText = g_autoCompleteText_newMerge // gui/common/functions_utility~autociv.js
// autoCompleteText = autoCompleteText_original


/* autoCompleteText.state is not a global variable. It is a property of the autoCompleteText object.
The autoCompleteText object is defined above in the code, and the .state property is used to store and track the previous texts for auto-completion.
This object is likely used within the scope of the module or function where it is defined.
*/
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
    const modProfile_alwaysIn_Default = 'localratings feldmap'
    const mo = Engine.ConfigDB_GetValue("user", modProfile_alwaysIn_Key );
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
          clean = "no-blood-and-gore-mod"; // proGUI was removed from default 23-0730_1210-33
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


          if(false){ // outdated
            const key = "autocivP.gamesetup.restart";
            ConfigDB_CreateAndSaveValueA26A27("user", key, 'restart');
            Engine.SwitchGuiPage("page_pregame.xml");
          }else
            Engine.Exit(1)


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

  if (!clean.includes(' autocivp'))
    clean += ' autocivp';

  return clean.replace(/\bautocivP\b/ig, `${modProfileAlwaysIn} autocivp` );
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

function captionIs_j(guiObject){
    // "Select chat addressee." "Everyone"=0 "Allies"=1 Enemies=2 Observers=3
    const chatAddressBox = Engine.GetGUIObjectByName("chatAddressee"); // found this name in binaries/data/mods/public/gui/session/chat/chat_window.xml

  if(gameState != "ingame" || chatAddressBox.selected != 1){ // 1 is Allies
    let text = `to use jiti in you team: 1. open Ally-Chat 2. write j⟦Tab⟧ then enter. 3. write li⟦Tab⟧ or /link`
    selfMessage(text)
    return
}

if (g_linkLongTeam == null) {
    const linkidShort = Date.now().toString().substring(10);
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
  // caption = g_linkLongTeam;
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

return true;

}

function captionIs_me(guiObject){
  const key = "autocivP.msg.me";
  const text = Engine.ConfigDB_GetValue("user", key);
  if(!text)
      selfMessage('me is empty.');
  else
    guiObject.caption = text
  return;
}
function captionIs_meURL(guiObject){
  const key = "autocivP.msg.meURL";
  const text = Engine.ConfigDB_GetValue("user", key);
  if(!text)
      selfMessage('url is empty.');
  else
    guiObject.caption = text
  return;
}
function captionIs_hiall(guiObject){
  const key = "autocivP.msg.helloAll";
  const helloAll = Engine.ConfigDB_GetValue("user", key);
  if(!helloAll)
    selfMessage('helloAll is empty.');
  else
    guiObject.caption = helloAll
  selfMessage('set /hiAll yourWelcomeText or use /hiAll yourWelcomeText or send by /hiAll or helloAll tab, to edit it first.');
  return;
}
function captionIs_modsImCurrentlyUsing(guiObject){ // this function will be triggerd from by in game chat
  const modEnabledmods = Engine.ConfigDB_GetValue(
    "user",
    "mod.enabledmods"
  );
  // sendMessage(`Mods I'm currently using: ${modEnabledmods.slice(11,)}` );
  let text = `Mods I'm currently using: ${modEnabledmods.slice(11,)}`
  text = text.replace('feldmap', 'feldmap♒') //  ♡ autocivP❧♣▦▣ mod

  text = text.replace('proGUI', 'proGUI★') //  ♡ autocivP❧♣▦▣ mod
  // text = text.replace('autocivP', 'autocivP☼') //  ♡ autocivP❧♣▦▣ mod
  text = text.replace(/\bautocivP\b/ig, 'autocivP♇') //  ♡ autocivP❧♣▦▣ mod

  guiObject.caption = text;
  return;
}

/**
 * Remove special tags delimiter from the caption and update the GUI object's caption.
 *
 * @param {Object} guiObject - The GUI object to update.
 * @param {string} caption - The caption to process.
 */
function remove_delimiters_from_chat_icon_message(guiObject, caption){
  caption = caption.replace(/[‹›]/g, ''); // cut out all special tags delimiter
  g_lastCommand = caption
  // guiObject.caption = caption
  // selfMessage(`161 ${caption.toLowerCase()} = ${caption}`)
  // selfMessage(`169 ${caption}`)
  guiObject.caption = caption
  return caption
}

/**
 * Determines if the function is transGGWP_needet.
 *
 * @param {string} caption - The caption parameter.
 * @param {string} firstChar - The firstChar parameter.
 * @param {string} iconPrefix - The iconPrefix parameter.
 * @param {object} guiObject - The guiObject parameter.
 * @return {boolean} The result of the function.
 */
function is_transGGWP_needet(caption, firstChar, iconPrefix, guiObject) {
  const doTabReplacmentWor_gl_hf_gg_wp_stuff = true; // usefull for debugging maybe
  return doTabReplacmentWor_gl_hf_gg_wp_stuff
  &&
  (
    caption.length > 1 // prevent conflict with seldon username
    ||
    !firstChar.match(/[a-z]/i) // not a  a-z(ignoreCase) first lettter
  )
  &&
    // !firstChar.match(/[A-Z]/) // not Upercase A-Z first lettter. Upercase is not recomanded as seach words. especially not in a shorter text. Now fixed: Ha => Han, before it was Ha => hand
    !caption.match(/\b[A-Z]/) // not Upercase word start A-Z in caption. more strict. Easier to explain and maybe easier to use and remeber this rule, then only use this rule for the first letter
  &&
  (
    caption.length <= 90 //NOTE - 300 maybe too long . prefent multiple repacment
    || guiObject.buffer_position > 14 // maybe user want gg wp replacments in a longer text and cursor is in the middle or at the end
  )
  &&
  (
    !iconPrefix.length && firstChar != '/'
    ||
    firstChar == iconPrefix
  )
}

function setCaption2LastCommandOfHistory(guiObject){


    let doDebug = false // debug session
    // doDebug = true // debug session

    let lastCommand;
    const is_g_lastCommandID_correkt = ( !isNaN(g_lastCommandID) && g_lastCommandID >= 0 )

    if( is_g_lastCommandID_correkt ){
        lastCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${g_lastCommandID}`);


        // if(gameState == "ingame" || isSelfHost() != true){
        if(gameState == "ingame" || g_selfIsHost != true){
          if(/^\/p|^\/\d/.test(lastCommand)){ //  /p or /\d
            // selfMessage(`hide mapCofigProfileComands in ingame state ( ${lastCommand} )`)
            g_lastCommandID = getNextLastCommandID()
            return true
          }
        }


    }else{
        error('23-0628_0020-57')
        selfMessage(`ERROR: g_lastCommandID is not correct.`)
    }
    if(!lastCommand)
        return false

    if(doDebug)
      selfMessage(`1007: lastCommand = ${lastCommand}`)

    g_previousCaption = guiObject.caption
    guiObject.caption = lastCommand
    g_lastCommand = lastCommand
    return true
}

/**
 * Sets the caption of the next command in the history to the given GUI object.
 *
 * @param {Object} guiObject - The GUI object to set the caption to.
 * @return {boolean} Returns true if the caption is successfully set, false otherwise.
 */
function setCaption2nextCommandOfHistory(guiObject){
  let nextID = getNextLastCommandID()
  g_lastCommandID = nextID;
  // selfMessage(`947: >>>>>>>>${g_lastCommandID}<<<<<<<< ' = g_lastCommandID`);
  // selfMessage(`939: nextID = ${nextID}'  gui/common/functions_utility~autociv.js`);
  let nextCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${nextID}`);
  // selfMessage(`941: >>>${nextCommand}<<<  gui/common/functions_utility~autociv.js`);
  // autocivP.chat.lastCommand4 = "jajaja"

  // if(isSelfHost() != true)
  //   selfMessage(`1007: g_selfInHost = ${g_selfInHost}`)


  // if(gameState == "ingame" || isSelfHost() != true){ // obsolete
  if(gameState == "ingame" || g_selfIsHost != true){
    if(/^\/p|^\/\d/.test(nextCommand)){ //  /p or /\d
      // selfMessage(`hide mapCofigProfileComands in ingame state ( ${nextCommand } )`)
      g_lastCommandID = getNextLastCommandID()
      return false
    }
  }


  if( !(nextCommand?.length) )
  {
          nextID = 0
          nextCommand = Engine.ConfigDB_GetValue("user", `autocivP.chat.lastCommand${nextID}`);
          // selfMessage(`761: nextID = ${nextID}, g_lastCommandID = ${g_lastCommandID}, nextCommand = ${nextCommand}`);
          g_lastCommandID = nextID;
          // selfMessage(`951: ${g_lastCommandID}' = g_lastCommandID  gui/common/functions_utility~autociv.js`);
          if(!(nextCommand?.length))
            return false
  }

  if(nextCommand?.length){
      g_lastCommand = nextCommand;
      g_lastCommandID = nextID;
      // caption = nextCommand ;
      g_previousCaption = guiObject.caption
      guiObject.caption = nextCommand; // use of guiObject.caption not caption solved a seldom critical crash
      // selfMessage(`761: nextID = ${nextID}, g_lastCommandID = ${g_lastCommandID}, nextCommand = ${nextCommand}`);
      return true;
  }
  // selfMessage('never heppens? 23-0628_1307-15')
  // selfMessage(`775 nextID = ${nextID}, g_lastCommandID = ${g_lastCommandID}, nextCommand = ${nextCommand}`);
  // g_lastCommandID = nextID;
  return false
}



function captionCheck_is_communityModToggle_optional_restartOad(caption, doRestart0ad = false){
  if(caption.trim() == "communityModToggle"){


    if(gameState == "ingame"){
      selfMessage(`communityModToggle is not allowed in ingame.`)
      return false
    }

    if(!doRestart0ad){
      return true // yes the caption is communityModToggle, but do not restart0ad now
    }


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
  }
}

function truncateString(str, num) {
  if (str.length > num) {
    return str.slice(0, num) + "...";
  } else {
    return str;
  }
}
