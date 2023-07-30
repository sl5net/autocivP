let g_proGUIPVersion = null;

/**
 * Whether we are attempting to join or host a game.
 * this file will proofed when you join a game
 */
var g_IsConnecting = false;

/**
 * "server" or "client"
 */
let g_GameType;

/**
 * Server title shown in the lobby gamelist.
 */
let g_ServerName = "";

/**
 * Identifier if server is using password.
 */
let g_ServerHasPassword = false;

let g_ServerId;

let g_IsRejoining = false;
let g_PlayerAssignments; // used when rejoining
let g_UserRating;
// added by custom rating
let g_PlayerName;


function init(attribs) {
    let g_UserRatingString;
    /*
    https://wildfiregames.com/forum/topic/55450-howto-read-~snap0ad236localshare0adreplays00252021-08-05_0002metadatajson/?do=findComment&comment=452775
    how to read howTo read metadata.json from a mod ? (  ~/snap/0ad/236/.local/share/0ad/replays/0.0.25/2021-08-05_0002/metadata.json )
    That file is used in the replaymenu in the public mod. It is loaded via Engine.GetReplayMetadata called from replay_menu.js
     */
    if (!attribs || !attribs.rating) {
        g_UserRatingString = Engine.ConfigDB_GetValue("user", "UserRatingBackup"); // get backup
        g_UserRating = g_UserRatingString > 10 ? g_UserRatingString : '';
    } else {
        g_UserRating = (attribs.rating);
        g_UserRatingString = "" + g_UserRating + "";
        Engine.ConfigDB_CreateValue("user", "UserRatingBackup", g_UserRatingString); // 1 just as dummy
        Engine.ConfigDB_WriteValueToFile("user", "UserRatingBackup", g_UserRatingString, "config/user.cfg"); // backup rating if rating-server is working
    }

    // added by custom rating - START
    let customrating_value = Engine.ConfigDB_GetValue("user", "autocivP.customusername");
    const customrating_trueFalse = Engine.ConfigDB_GetValue("user", "customrating");


    const modsObj = Engine.GetEngineInfo().mods
    for (const [key, value] of Object.entries(modsObj)) {
        if (value.name === "proGUI") {
            g_proGUIPVersion = value.version
        break
        }
    }

    if (customrating_trueFalse == "false" && !g_proGUIPVersion ) { // if g_proGUIP is used then always us customrating
        // Get only username without brackets
        g_UserRating = false;
        // if(g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
        //     warn('67: set: g_UserRating = false')
        // }
    } else if (true) { //  || isNaN(customrating_value)

        // if(g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
        //     warn('72: set: g_UserRating = false')
        // }

        //replace extra chars (hav to do this coz options save button will save them in wrong charset)
        // customrating_value = customrating_value.replace(/\^1/g,"∞");
        // https://unicode-table.com/de/2665/

        const isCustomratingEnabled = ( customrating_trueFalse != "false" )
        if(isCustomratingEnabled){
            customrating_value = customrating_value.replace(/\^n/g, "nuub");
            customrating_value = customrating_value.replace(/\^vn/g, "very nub");
            customrating_value = customrating_value.replace(/\^0/g, "youtuber");
            customrating_value = customrating_value.replace(/\^1/g, "unfocused today");
            customrating_value = customrating_value.replace(/\^2/g, " rated");
            customrating_value = customrating_value.replace(/\^3/g, " unrated");
            // customrating_value = customrating_value.replace(/\^3/g,"™");
            customrating_value = customrating_value.replace(/\^4/g, " programmer\?");
            // customrating_value = customrating_value.replace(/\^5/g,"↑");
            customrating_value = customrating_value.replace(/\^5/g, " spec");
            customrating_value = customrating_value.replace(/\^6/g, " spec\=i not play");
            customrating_value = customrating_value.replace(/\^7/g, " ill today");
            customrating_value = customrating_value.replace(/\^8/g, " overrated");
            customrating_value = customrating_value.replace(/\^9/g, " underrated");
            // customrating_value = customrating_value.replace('Host','');
            customrating_value = customrating_value.replace(/^[^\d\w\-]*[0-9]+[^\d\w\-]*$/g, ''); // if its only a number. cut it out
        }

        // warn(`112: customrating_value: ${customrating_value}`);
        // if(g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
        //     warn(`g_proGUIPVersion: ${g_proGUIPVersion}`)
        // }

        const delimiterSymbol = "|"; // |
        if(false || g_proGUIPVersion){
            const temp = "proGUI*"; // this was now recorded, when i was playing in a bigh TG (not as host). funny. is this always? i was not able to reconstruct it when starting a local game 23-0730_1401-05
            customrating_value = ( isCustomratingEnabled && customrating_value && customrating_value !== 'false')
            ? `${temp}${delimiterSymbol}${customrating_value}`
            : temp ;
        }



        if (typeof g_LocalRatingsDatabase !== 'undefined') { // DODO sad its not available from autocivP ... means i need rebuild/copy some functions. should i do this ? 23-0722_1551-58 . i hope maybe Mentula will do it maybe in a day in future
            const playerName = 'seeh'
            const playerData = g_LocalRatingsDatabase[playerName];
            customrating_value += ` LR ${playerData.rating}`;
        }


        if ( customrating_value === 'false') {
            //no rating in username
            // g_UserRating = attribs.rating + " // if its empty . enabled but empty => works 2021-0902_1324-54
            // g_UserRating = attribs.rating + " // if its empty . enabled but empty => works bot long for this field. end ) is not there 2021-0902_1326-08
            g_UserRating = attribs.rating //  // if its empty . enabled but empty => works bot long for this field. end ) is not there 2021-0902_1327-19
        } else {
            //g_UserRating = customrating_value.substring(0,10)
            // g_UserRating = customrating_value.substring(0,16);
            // warn(`112: customrating_value: ${customrating_value}`);
            const maxLength = 24; // if you set here to long then later the ')' will cut off. 25 was a mistake. 25 seems the maximum length possible 23-0728_1307-06,  33 when you observer 23-0728_2214-44
            // max. 25 letter, then its cut off. 33 when you observer 23-0728_2214-50
            // local hosted game: max. 33 letter, then its cut off . Example(pink yourself): seeh (1205|proGUI|unfocused toda
            customrating_value = customrating_value.trim()
            let length_ratingPlusCustomRating = g_UserRating.length + customrating_value.length + 1;
            if(length_ratingPlusCustomRating > maxLength){
                customrating_value = customrating_value.substring(0,maxLength - g_UserRating.length - 2) + "..";
            }

            // const lastLetter = customrating_value.charAt(customrating_value.length - 1);
            // if(lastLetter != ')'){
            //     customrating_value += ')';
            // }
            const bugIt = false
            if(bugIt && g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
                warn(`141: set: g_UserRating = ${g_UserRating} , \n customrating_value: ${customrating_value}`);
                warn(`142: length: ${customrating_value.length} , \n customrating_value: ${customrating_value}`);
            }


            g_UserRating =  (customrating_value )
            ? g_UserRating + ((g_UserRating) ? '|': '') + customrating_value + ''
            : g_UserRating;
            // g_UserRating = customrating_value + ""; // customrating_value not empty with som texts


            if(bugIt && g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
                warn(`149: set: g_UserRating = ${g_UserRating} , \n customrating_value: ${customrating_value}`);
                warn(`151: length: ${customrating_value.length} , \n customrating_value: ${customrating_value}`);
            }

        }
    } else {
        warn('159: whish you good game. as observer your name is 33 letters max long');
        //warn(uneval("customrating numbers not allowed - adding spaces"));
        // g_UserRating = " " + customrating_value.substring(0,16) + " ";
        g_UserRating = " " + customrating_value + " "; // <= need a space at the end . for prevent errors
        // here we observers
        // // max. 25 letter, then its cut off. 33 when you observer 23-0728_2214-50
    }
    //g_ServerPort = attribs.port;
    if(true)
        g_PlayerName = !!attribs.name
        ? attribs.name + (g_UserRating ? " (" + g_UserRating + ")"
        : "")
        : "";

    // g_PlayerName = 'seeh (1205)';
    if(g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
        warn(uneval("attribs.name:" + attribs.name));
        warn(uneval("g_UserRating:" + g_UserRating));
        warn(uneval("g_UserRatingString:" + g_UserRatingString));
        warn(uneval("g_GameType:" + g_GameType)); // undefined
        warn(uneval("g_PlayerName:" + g_PlayerName)); // undefined

        // warn(`attribs: ${attribs.multiplayerGameType.prototype.toString()}`)
         // JSON.stringify() but specifically for converting JavaScript objects into a string representation

    }
    // added by custom rating - END
    switch (attribs.multiplayerGameType) {
        case "join": {
            if (!Engine.HasXmppClient()) {
                switchSetupPage("pageJoin");
                break;
            }
            if (attribs.hasPassword) {
                g_ServerName = attribs.name;
                g_ServerId = attribs.hostJID;
                switchSetupPage("pagePassword");
            } else if (startJoinFromLobby(attribs.name, attribs.hostJID, ""))
                switchSetupPage("pageConnecting");
            break;
        }
        case "host": {
            let hasXmppClient = Engine.HasXmppClient();
            Engine.GetGUIObjectByName("hostSTUNWrapper").hidden = !hasXmppClient;
            Engine.GetGUIObjectByName("hostPasswordWrapper").hidden = !hasXmppClient;
            if (hasXmppClient) {
                Engine.GetGUIObjectByName("hostPlayerName").caption = attribs.name;
                Engine.GetGUIObjectByName("hostServerName").caption =
                    sprintf(translate("%(name)s's game"), {"name": attribs.name});

                Engine.GetGUIObjectByName("useSTUN").checked = Engine.ConfigDB_GetValue("user", "lobby.stun.enabled") == "true";
            }

            switchSetupPage("pageHost");
            break;
        }
        default:
            error("Unrecognised multiplayer game type: " + attribs.multiplayerGameType);
            break;
    }
}

function cancelSetup() {
    if (g_IsConnecting)
        Engine.DisconnectNetworkGame();

    if (Engine.HasXmppClient())
        Engine.LobbySetPlayerPresence("available");

    // Keep the page open if an attempt to join/host by ip failed
    if (!g_IsConnecting || (Engine.HasXmppClient() && g_GameType == "client")) {
        Engine.PopGuiPage();
        return;
    }

    g_IsConnecting = false;
    Engine.GetGUIObjectByName("hostFeedback").caption = "";

    if (g_GameType == "client")
        switchSetupPage("pageJoin");
    else if (g_GameType == "server")
        switchSetupPage("pageHost");
    else
        error("cancelSetup: Unrecognised multiplayer game type: " + g_GameType);
}

function confirmPassword() {
    if (Engine.GetGUIObjectByName("pagePassword").hidden)
        return;
    if (startJoinFromLobby(g_ServerName, g_ServerId, Engine.GetGUIObjectByName("clientPassword").caption))
        switchSetupPage("pageConnecting");
}

function confirmSetup() {
    if (!Engine.GetGUIObjectByName("pageJoin").hidden) {
        let joinPlayerName = Engine.GetGUIObjectByName("joinPlayerName").caption;
        let joinServer = Engine.GetGUIObjectByName("joinServer").caption;
        let joinPort = Engine.GetGUIObjectByName("joinPort").caption;

        if (startJoin(joinPlayerName, joinServer, getValidPort(joinPort)))
            switchSetupPage("pageConnecting");
    } else if (!Engine.GetGUIObjectByName("pageHost").hidden) {
        let hostServerName = Engine.GetGUIObjectByName("hostServerName").caption;
        if (!hostServerName) {
            Engine.GetGUIObjectByName("hostFeedback").caption = translate("Please enter a valid server name.");
            return;
        }

        let hostPort = Engine.GetGUIObjectByName("hostPort").caption;
        if (getValidPort(hostPort) != +hostPort) {
            Engine.GetGUIObjectByName("hostFeedback").caption = sprintf(
                translate("Server port number must be between %(min)s and %(max)s."), {
                    "min": g_ValidPorts.min,
                    "max": g_ValidPorts.max
                });
            return;
        }

        let hostPlayerName = Engine.GetGUIObjectByName("hostPlayerName").caption;
        let hostPassword = Engine.GetGUIObjectByName("hostPassword").caption;
        if (startHost(hostPlayerName, hostServerName, getValidPort(hostPort), hostPassword))
            switchSetupPage("pageConnecting");
    }
}

function startConnectionStatus(type) {
    g_GameType = type;
    g_IsConnecting = true;
    g_IsRejoining = false;
    Engine.GetGUIObjectByName("connectionStatus").caption = translate("Connecting to server...");
}

function onTick() {
    if (!g_IsConnecting)
        return;

    pollAndHandleNetworkClient();
}

function getConnectionFailReason(reason) {
    switch (reason) {
        case "not_server":
            return translate("Server is not running.");
        case "invalid_password":
            return translate("Password is invalid.");
        case "banned":
            return translate("You have been banned.");
        case "local_ip_failed":
            return translate("Failed to get local IP of the server (it was assumed to be on the same network).");
        default:
            warn("Unknown connection failure reason: " + reason);
            return sprintf(translate("\\[Invalid value %(reason)s]"), {"reason": reason});
    }
}

function reportConnectionFail(reason) {
    messageBox(
        400, 200,
        (translate("Failed to connect to the server.")
        ) + "\n\n" + getConnectionFailReason(reason),
        translate("Connection failed")
    );
}

function pollAndHandleNetworkClient() {
    while (true) {
        var message = Engine.PollNetworkClient();
        if (!message)
            break;

        log(sprintf(translate("Net message: %(message)s"), {"message": uneval(message)}));
        // If we're rejoining an active game, we don't want to actually display
        // the game setup screen, so perform similar processing to gamesetup.js
        // in this screen
        if (g_IsRejoining) {
            switch (message.type) {
                case "serverdata":
                    switch (message.status) {
                        case "failed":
                            cancelSetup();
                            reportConnectionFail(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "netstatus":
                    switch (message.status) {
                        case "disconnected":
                            cancelSetup();
                            reportDisconnect(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "players":
                    g_PlayerAssignments = message.newAssignments;
                    break;

                case "start":
                    Engine.SwitchGuiPage("page_loading.xml", {
                        "attribs": message.initAttributes,
                        "isRejoining": g_IsRejoining,
                        "playerAssignments": g_PlayerAssignments
                    });

                    // Process further pending netmessages in the session page
                    return;

                case "chat":
                    break;

                case "netwarn":
                    break;

                default:
                    error("Unrecognised net message type: " + message.type);
            }
        } else
            // Not rejoining - just trying to connect to server.
        {
            switch (message.type) {
                case "serverdata":
                    switch (message.status) {
                        case "failed":
                            cancelSetup();
                            reportConnectionFail(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "netstatus":
                    switch (message.status) {
                        case "connected":
                            Engine.GetGUIObjectByName("connectionStatus").caption = translate("Registering with server...");
                            break;

                        case "authenticated":
                            if (message.rejoining) {
                                Engine.GetGUIObjectByName("connectionStatus").caption = translate("Game has already started, rejoining...");
                                g_IsRejoining = true;
                                return; // we'll process the game setup messages in the next tick
                            }
                            Engine.SwitchGuiPage("page_gamesetup.xml", {
                                "serverName": g_ServerName,
                                "hasPassword": g_ServerHasPassword
                            });
                            return; // don't process any more messages - leave them for the game GUI loop

                        case "disconnected":
                            cancelSetup();
                            reportDisconnect(message.reason, false);
                            return;

                        default:
                            error("Unrecognised netstatus type: " + message.status);
                            break;
                    }
                    break;

                case "netwarn":
                    break;

                default:
                    error("Unrecognised net message type: " + message.type);
                    break;
            }
        }
    }
}

function switchSetupPage(newPage) {
    let multiplayerPages = Engine.GetGUIObjectByName("multiplayerPages");
    for (let page of multiplayerPages.children)
        if (page.name.startsWith("page"))
            page.hidden = true;

    if (newPage == "pageJoin" || newPage == "pageHost") {
        let pageSize = multiplayerPages.size;
        let halfHeight = newPage == "pageJoin" ? 145 : Engine.HasXmppClient() ? 140 : 125;
        pageSize.top = -halfHeight;
        pageSize.bottom = halfHeight;
        multiplayerPages.size = pageSize;
    } else if (newPage == "pagePassword") {
        let pageSize = multiplayerPages.size;
        let halfHeight = 60;
        pageSize.top = -halfHeight;
        pageSize.bottom = halfHeight;
        multiplayerPages.size = pageSize;
    }

    Engine.GetGUIObjectByName(newPage).hidden = false;

    Engine.GetGUIObjectByName("hostPlayerNameWrapper").hidden = Engine.HasXmppClient();
    Engine.GetGUIObjectByName("hostServerNameWrapper").hidden = !Engine.HasXmppClient();

    Engine.GetGUIObjectByName("continueButton").hidden = newPage == "pageConnecting" || newPage == "pagePassword";
}

function startHost(playername, servername, port, password) {
    startConnectionStatus("server");

    Engine.ConfigDB_CreateAndWriteValueToFile("user", "playername.multiplayer", playername, "config/user.cfg");

    Engine.ConfigDB_CreateAndWriteValueToFile("user", "multiplayerhosting.port", port, "config/user.cfg");

    let hostFeedback = Engine.GetGUIObjectByName("hostFeedback");

    // Disallow identically named games in the multiplayer lobby
    if (Engine.HasXmppClient() &&
        Engine.GetGameList().some(game => game.name == servername)) {
        cancelSetup();
        hostFeedback.caption = translate("Game name already in use.");
        return false;
    }

    let useSTUN = Engine.HasXmppClient() && Engine.GetGUIObjectByName("useSTUN").checked;

    try {
        Engine.StartNetworkHost(playername + (g_UserRating ? " (" + g_UserRating + ")" : ""), port, useSTUN, password);
    } catch (e) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf(translate("Cannot host game: %(message)s."), {"message": e.message}),
            translate("Error")
        );
        return false;
    }

    g_ServerName = servername;
    g_ServerHasPassword = !!password;

    if (Engine.HasXmppClient())
        Engine.LobbySetPlayerPresence("playing");

    return true;
}

/**
 * Connect via direct IP (used by the 'simple' MP screen)
 */
function startJoin(playername, ip, port) {
    try {
        Engine.StartNetworkJoin(playername, ip, port);
    } catch (e) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf(translate("Cannot join game: %(message)s."), {"message": e.message}),
            translate("Error")
        );
        return false;
    }

    startConnectionStatus("client");

    // Future-proofing: there could be an XMPP client even if we join a game directly.
    if (Engine.HasXmppClient())
        Engine.LobbySetPlayerPresence("playing");

    // Only save the player name and host address if they're valid.
    Engine.ConfigDB_CreateAndWriteValueToFile("user", "playername.multiplayer", playername, "config/user.cfg");
    Engine.ConfigDB_CreateAndWriteValueToFile("user", "multiplayerserver", ip, "config/user.cfg");
    Engine.ConfigDB_CreateAndWriteValueToFile("user", "multiplayerjoining.port", port, "config/user.cfg");
    return true;
}

/**
 * Connect via the lobby.
 */
function startJoinFromLobby(playername, hostJID, password) {
    if (!Engine.HasXmppClient()) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf("You cannot join a lobby game without logging in to the lobby."),
            translate("Error")
        );
        return false;
    }

    try {
        Engine.StartNetworkJoinLobby(playername + (g_UserRating ? " (" + g_UserRating + ")" : ""), hostJID, password);
    } catch (e) {
        cancelSetup();
        messageBox(
            400, 200,
            sprintf(translate("Cannot join game: %(message)s."), {"message": e.message}),
            translate("Error")
        );
        return false;
    }

    startConnectionStatus("client");

    Engine.LobbySetPlayerPresence("playing");

    return true;
}

function getDefaultGameName() {
    return sprintf(translate("%(playername)s's game"), {
        "playername": multiplayerName()
    });
}

function getDefaultPassword() {
    return "";
}
