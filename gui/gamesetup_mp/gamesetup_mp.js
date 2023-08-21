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

let g_LocalRatingsUser = null;


function init (attribs) {
    if (!attribs || !attribs.rating) {
        const currentRating = Engine.ConfigDB_GetValue("user", "UserRatingBackup"); // get backup
        g_UserRating = parseInt(currentRating) > 10 ? currentRating : '';
    } else {
        g_UserRating = attribs.rating;
        Engine.ConfigDB_CreateValue("user", "UserRatingBackup", attribs.rating);
        Engine.ConfigDB_WriteValueToFile("user", "UserRatingBackup", attribs.rating, "config/user.cfg"); // backup rating if rating-server is working
    }

    let customRating        = '';
    const usingCustomRating = getBoolOpt('customrating');
    const useLocalRatings   = getBoolOpt('autocivP.mod.useLocalRatings');
    // const showLocalRatings  = getBoolOpt('autocivP.mod.showLocalRatings');
    const showLocalRatingsDropdown  = Engine.ConfigDB_GetValue("user", "autocivP.mod.showLocalRatingsDropdown");


    const hasLocalRatings   = typeof init_LocalRatings != 'undefined';

    info('showLocalRatingsDropdown:', showLocalRatingsDropdown,'showLocalRatingsDropdown:', showLocalRatingsDropdown, 'hasLocalRatings:', hasLocalRatings);

    if (hasLocalRatings && (useLocalRatings || showLocalRatingsDropdown)) {
        info('try to use local ratings database, with user: ', g_selfNick);
        g_LocalRatingsUser = init_LocalRatings()[g_selfNick];

        // if you want add g_LocalRatingsUser.matches but i feels its to long for usernames
        if (g_LocalRatingsUser) {

            if(showLocalRatingsDropdown == '^lr')
                g_LocalRatingsUser = g_UserRating + '|' + (g_LocalRatingsUser.rating * 100).toFixed(2);

            if(showLocalRatingsDropdown == '^lr_PlusGames')
                g_LocalRatingsUser = g_UserRating + '|' + (g_LocalRatingsUser.rating * 100).toFixed(2)
                + '|' + g_LocalRatingsUser.matches;

            if(showLocalRatingsDropdown == '^lr_NoNormalRating')
                g_LocalRatingsUser = (g_LocalRatingsUser.rating * 100).toFixed(2);

            if(showLocalRatingsDropdown == '^lr_NoNormalRating_PlusGames')
                g_LocalRatingsUser = (g_LocalRatingsUser.rating * 100).toFixed(2)
                + '|' + g_LocalRatingsUser.matches;


        }

        // warn(`g_LocalRatingsUser: ${g_LocalRatingsUser}`);
        // warn(`showLocalRatingsDropdown: ${showLocalRatingsDropdown}`);

        info('g_LocalRatingUser:', g_LocalRatingsUser);
    }

    for (const [key, value] of Object.entries(Engine.GetEngineInfo().mods)) {
        if (value.name === "proGUI") {
            g_proGUIPVersion = value.version
        break
        }
    }

    if (usingCustomRating) {
        const appendToCustomRating = getBoolOpt('autocivP.mod.appendToCustomRating');
        const optionsCustomRating  = {
            '^n':    'nuub',
            '^vn':   'very nub',
            '^0':    'youtuber',
            '^1':    'unfocused today',
            '^2':    ' rated',
            '^3':    ' unrated',
            '^4':    ' programmer\?',
            '^5':    ' spec',
            '^6':    ' spec\=i not play',
            '^7':    ' ill today',
            '^8':    ' overrated',
            '^9':    ' underrated',
            'false': ' '
        };

        customRating = getOpt('autocivP.customUsernameDropdown');
        info('proGUI:', g_proGUIPVersion, 'customrating:', customRating);

        customRating = optionsCustomRating[customRating] || customRating;
        customRating = customRating.replace(/^[^\d\w\-]*[0-9]+[^\d\w\-]*$/g, '');
        customRating = customRating.length > 1 ? customRating : getOpt('customrating.string');
        info('customrating:', customRating);

        if (appendToCustomRating) {
            const useItWithoutUnicode       = getBoolOpt('autociv.chatText.font.useItWithoutUnicode');
            const showStartWhenUsingProGUI   = getBoolOpt('autocivP.mod.showStartWhenUsingProGUI');
            const showIconWhenUsingAutocivP = getBoolOpt('autocivP.mod.showIconWhenUsingAutocivP');

            customRating = [
                g_LocalRatingsUser && showLocalRatingsDropdown ? g_LocalRatingsUser : g_UserRating,
                (!g_proGUIPVersion ? '' : (showStartWhenUsingProGUI ?
                    (useItWithoutUnicode ? '*' : "♤") : 'proGUI'))
                    +
                    (showIconWhenUsingAutocivP ?  (useItWithoutUnicode ? 'AP' : '♇') : ''),
                customRating.trim()
            ].filter(Boolean).join('|');

            if(customRating)
                customRating = customRating.replace(/\|([^\d\w\-])/, '$1'); // remove a pipe, when its still good to read, becouse name is sometimes a bit long

            info(
              'customrating:', customRating,
              'useItWithoutUnicode:', useItWithoutUnicode,
              'showStartWhenUsingProGUI:', showStartWhenUsingProGUI,
              'showIconWhenUsingAutocivP:', showIconWhenUsingAutocivP,
              'showLocalRatings:', showLocalRatingsDropdown,
              'hasLocalRatings:', hasLocalRatings
            );
        }
    }

    customRating = customRating.length > 0 ? customRating : g_UserRating +'';
    customRating = customRating.length > 24 ? customRating.substring(0,24) +'..' : customRating;
    g_UserRating = getRatings(customRating);
    g_PlayerName = !!attribs.name ? attribs.name + (g_UserRating.length > 0 ? ` (${g_UserRating})` : '') : '';

    info(
        'attribs.name:', attribs.name,
        'g_UserRating:', g_UserRating,
        'g_GameType:', g_GameType,
        'g_PlayerName:', g_PlayerName
    );

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


function info (...args) {
    const shouldDebug = getBoolOpt('autociv.settings.debug');

    if (!shouldDebug)
        return;

    const stack = (new Error()).stack.toString().split(/\r\n|\n/);

    warn(' [i] '+ stack[1] + '  '+ args.join(' '));
}

function getBoolOpt (option, context) {
    return getOpt(option, context) === 'true';
}

function getOpt (option, context) {
    context = context || 'user';
    return Engine.ConfigDB_GetValue(context, option);
}

function getRatings (currentRating) {
    const useLocalRatings = getBoolOpt('autocivP.mod.useLocalRatings');

    currentRating = (currentRating || '').length > 0 ? currentRating || '' : '';

    info('curentRating:', currentRating, 'useLocalRatings:', useLocalRatings);

    return ((g_LocalRatingsUser && useLocalRatings) ? g_LocalRatingsUser : currentRating).trim();
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
