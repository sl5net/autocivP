declare namespace Engine {
  /**
   * Returns true if changed with respect to last write on file.
   * @param namespace - Configuration namespace
   * @returns True if successful
   */
  function ConfigDB_HasChanges(
    namespace: "default" | "mod" | "system" | "user" | "hwdetect"
  ): boolean;

  /**
   * Set configuration namepace as changed or not changed.
   * @param namespace - Configuration namespace
   * @param changes - True if changes, false if no changes
   * @returns True if successful
   */
  function ConfigDB_SetChanges(
    namespace: "default" | "mod" | "system" | "user" | "hwdetect",
    changes: boolean
  ): boolean;

  /**
   * Get value from configuration namespace.
   * @param namespace - Configuration namespace
   * @param key - Name of the value
   * @returns Emptry string if no value defined (the key doesn't exist)
   */
  function ConfigDB_GetValue(
    namespace: "default" | "mod" | "system" | "user" | "hwdetect",
    key: string
  ): string;

  /**
   * Save a config value in the specified namespace. If the config variable
   * existed the value is replaced.
   * @param namespace - Configuration namespace
   * @param key - Name of the value
   * @param value - Value
   * @returns True if successful
   */
  function ConfigDB_CreateValue(
    namespace: "default" | "mod" | "system" | "user" | "hwdetect",
    key: string,
    value: string
  ): boolean;

  /**
   * Remove a config value in the specified namespace.
   * @param namespace - Configuration namespace
   * @param key - Name of the value
   * @returns True if successful
   */
  function ConfigDB_RemoveValue(
    namespace: "default" | "mod" | "system" | "user" | "hwdetect",
    key: string
  ): boolean;

  /**
   * Save the current state of the specified config namespace
   * @param namespace - Configuration namespace
   * @param path - File path (file name included)
   * @returns True if successful
   */
  function ConfigDB_Save(
    namespace: "default" | "mod" | "system" | "user" | "hwdetect",
    path: string
  ): boolean;

  /**
   * Write a config value to the file specified by 'path'
   * @param namespace - Configuration namespace
   * @param key - Name of the value
   * @param value - Value
   * @returns True if successful
   */
  function ConfigDB_CreateAndSaveValue(
    namespace: "default" | "mod" | "system" | "user" | "hwdetect",
    key: string,
    value: string,
  ): boolean;

  /**
   * Sequential call of:
   * 1) ConfigDB_CreateValue
   * 2) ConfigDB_WriteValueToFile
   * @param namespace - Configuration namespace
   * @param key - Name of the value
   * @param value - Value
   * @param path - File path (file name included)
   */
  function ConfigDB_CreateAndWriteValueToFile(
    namespace: "default" | "mod" | "system" | "user" | "hwdetect",
    key: string,
    value: string,
    path: string
  ): void;

  /**
   * Set the path to the config file used to populate the specified namespace
   * Note that this function does not actually load the config file. Use
   * the Reload() method if you want to read the config file at the same time.
   * @param namespace - Configuration namespace
   * @param path - File path (file name included)
   * @returns True if successful
   */
  function ConfigDB_SetFile(
    namespace: "default" | "mod" | "system" | "user" | "hwdetect",
    path: string
  ): boolean;

  /**
   * Reload the config file associated with the specified config namespace
   * (the last config file path set with SetConfigFile)
   * @param namespace - Configuration namespace
   * @returns True if successful
   */
  function ConfigDB_Reload(
    namespace: "default" | "mod" | "system" | "user" | "hwdetect"
  ): boolean;

  /**
   * Is console open or closed.
   */
  function Console_GetVisibleEnabled(): boolean;

  /**
   * Open or close console.
   * fparam visible
   */
  function Console_SetVisibleEnabled(visible: boolean): void;

  /**
   * Returns time in microseconds.
   */
  function GetMicroseconds(): number;

  /**
   * Deliberately cause the game to crash.
   * Currently implemented via access violation (read of address 0).
   * Useful for testing the crashlog / stack trace code.
   */
  function Crash(): void;

  /**
   * Display the error dialog with the given text.
   * This is less error-prone than ENSURE(0 && "text").
   * Note that "conditional expression is constant" warnings are disabled anyway.
   */
  function DisplayErrorDialog(text: string): void;

  /**
   * Equivalent of DisplayErrorDialog("Warning at user's request.").
   */
  function DebugWarn(): void;

  /**
   * Return the date/time at which the current executable was compiled.
   * @param params 4 possible modes
   * -1 -> "date time (svn revision)"
   *  0 -> date
   *  1 -> time
   *  2 -> revision
   *
   * Notes:
   * - Displayed on main menu screen; tells non-programmers which auto-build
   *   they are running. Could also be determined via .EXE file properties,
   *   but that's a bit more trouble.
   * - To be exact, the date/time returned is when scriptglue.cpp was
   *   last compiled, but the auto-build does full rebuilds.
   * - svn revision is generated by calling svnversion and cached in
   *   lib/svn_revision.cpp. it is useful to know when attempting to
   *   reproduce bugs (the main EXE and PDB should be temporarily reverted to
   *   that revision so that they match user-submitted crashdumps).
   */
  function GetBuildTimestamp(value: number): string;

  /**
   * Load a new GUI page and make it active. All current pages will be retained,
   * and will still be drawn and receive tick events, but will not receive
   * user inputs.
   * If given, the callbackHandler function will be executed once this page is closed.
   * Note that the `initData` argument may only contain clonable data.
   * Functions aren't supported for example!
   * @param pageName - Page path (file included) relative to the gui folder
   * @param initData - Data to pass to the new page init function
   * @param initData.callback - Function name to call(in parent) when page is closed
   */
  function PushGuiPage(pageName: string, initData: { callback?: string }): void;

  /**
   * Load a new GUI page and make it active. All current pages will be destroyed.
   * @param pageName - Page path (file included) relative to the gui folder
   * @param initData - Data to pass to the new page init function
   */
  function SwitchGuiPage(pageName: string, initData: any): void;

  /**
   * Unload the currently active GUI page, and make the previous page active.
   * (There must be at least two pages when you call this.)
   * Call this when no callback is expected.
   */
  function PopGuiPage(): void;

  /**
   * Unload the currently active GUI page, and make the previous page active.
   * (There must be at least two pages when you call this.)
   * Call this when a callback is expected.
   * @param data - Data to pass to the callback function of the previous active page
   */
  function PopGuiPageCB(data: any): void;

  /**
   * Get the GUIObject instance of with said name.
   * @param name - GUI object name
   */
  function GetGUIObjectByName(name: string): GUIObject;

  /**
   * Set cursor (representation).
   * All cursors are defined in "art/textures/cursors/" path.
   * @param name - Name of cursor (only name, no path, no extension)
   * @returns Old cursor name
   */
  function SetCursor(name: string): string;

  /**
   * Resets to default cursor "default-arrow".
   */
  function ResetCursor(): void;

  /**
   * Check if a template with this name exists.
   * Root path: "simulation/templates/"
   * @param path - Relative path to template
   */
  function TemplateExists(path: string): boolean;

  /**
   * Retrieve the requested template.
   * Root path: "simulation/templates/"
   * @param path - Relative path to template (file included)
   * @returns Object representing the template structure
   */
  function GetTemplate(path: string): object;

  /**
   * Starts a game session.
   * @param gameAttributes - All the settings that define the game
   * @param playerID - ID for which the player will start as controller >0 for
   * player, 0 for gaia, -1 for observer
   */
  function StartGame(gameAttributes: object, playerID: number): void;

  /**
   * Ends game.
   * Resets all engine state related to the game, to before a game started
   */
  function EndGame(): any;

  /**
   * Returns player ID set to.
   * @returns Always -1 if no game started
   */
  function GetPlayerID(): number;

  /**
   * Sets to player ID.
   * Also calls SetViewedPlayer
   * Ignored if no game started.
   * @param value - ID to assign
   */
  function SetPlayerID(value: number): void;

  /**
   * See from the point of view of specific player.
   * @param value - ID to assign
   */
  function SetViewedPlayer(value: number): void;

  /**
   * Get timescale multiplier for simulation rate.
   */
  function GetSimRate(): number;

  /**
   * Set timescale multiplier for simulation rate.
   * @param value - Must be between > 0 and finite
   */
  function SetSimRate(value: number): void;

  /**
   * The game is paused and no updates will be performed if true.
   * Will report an error if no game currently running.
   */
  function IsPaused(): boolean;

  /**
   * Set pause state.
   * Will pause game, sound and send pause message to clients.
   * Will report an error if no game currently running.
   * @param pause - Pause game (local)
   * @param sendPauseMessage - Send pause message to other clients (if any)
   */
  function SetPaused(pause: boolean, sendPauseMessage: boolean): void;

  /**
   * Is the replay being rendered
   */
  function IsVisualReplay(): boolean;

  /**
   * Returns replay directory.
   * @returns Empty string if not in a game.
   */
  function GetCurrentReplayDirectory(): string;

  /**
   * Enables the recording of state snapshots every `numTurns`,
   * which can be jumped back to via RewindTimeWarp().
   * If `numTurns` is 0 then recording is disabled.
   * @param numTurns - Number of turns between each recording
   */
  function EnableTimeWarpRecording(numTurns: number): void;

  /**
   * Jumps back to the latest recorded state snapshot (if any).
   */
  function RewindTimeWarp(): void;

  /**
   * Dumps the terrain mipmap to disk path "screenshots/terrainmipmap.png"
   */
  function DumpTerrainMipmap(): void;

  /**
   * Culling removes object outside of the camera view from being rendered.
   */
  function GameView_SetCullingEnabled(value: boolean): void;
  function GameView_GetCullingEnabled(): boolean;

  /**
   * Locks the culling to the current camera view configuration.
   */
  function GameView_SetLockCullCameraEnabled(value: boolean): void;
  function GameView_GetLockCullCameraEnabled(): boolean;

  /**
   * Lock the camera viewin place (make it unable to change/move).
   */
  function GameView_SetConstrainCameraEnabled(value: boolean): void;
  function GameView_GetConstrainCameraEnabled(): boolean;

  /**
   * Get the current X coordinate of the camera.
   */
  function CameraGetX(): number;

  /**
   * Get the current Z coordinate of the camera.
   */
  function CameraGetZ(): number;

  /**
   * Move camera to a 2D location.
   */
  function CameraMoveTo(X: number, Z: number): void;

  /**
   * Set the camera to look at the given location.
   */
  function SetCameraTarget(X: number, Y: number, Z: number): void;

  /**
   * Set the data(position, orientation and zoom) of the camera.
   * @param rotx - In radians
   * @param roty - In radians
   * @param zoom - Zoom
   */
  function SetCameraData(
    X: number,
    Y: number,
    Z: number,
    rotx: number,
    roty: number,
    zoom: number
  ): void;

  /**
   * Start / stop camera following mode.
   * @param entityID unit id to follow. If zero, stop following mode
   */
  function CameraFollow(entityID: number): void;

  /**
   * Start / stop first-person camera following mode.
   * @param entityid unit id to follow. If zero, stop following mode.
   */
  function CameraFollowFPS(entityID: number): void;

  /**
   * Get entityID of entity followed by the camera.
   */
  function GetFollowedEntity(): number;

  /**
   * Get terrain position at screen point `X`,`Y`
   * @param X - Horizontal window coordinate (left to right)
   * @param Y - Vertical window coodinate (top to bottom)
   */
  function GetTerrainAtScreenPoint(
    X: number,
    Y: number
  ): { x: number; y: number; z: number };

  /**
   * Translation of the specified English string into the current language.
   * @param text - English string
   * @returns String into current language
   */
  function Translate(text: string): string;

  /**
   * Translation of the specified English string into the current language
   * for the specified context.
   * @param context - Context to use
   * @param text - English string
   * @returns String into current language
   */
  function TranslateWithContext(context: string, text: string): string;

  /**
   * Translated version of the given strings (singular and plural) depending
   * on an integer value.
   * @param singularText - Singular text
   * @param pluralText - Plural text
   * @param number - (e.g. for English 1 is singular)
   * @returns String into current language
   */
  function TranslatePlural(
    singularText: string,
    pluralText: string,
    number: number
  ): string;

  /**
   * Translated version of the given strings (singular and plural) depending
   * on an integer value.
   * @param context - Context to use
   * @param singularText - Singular text
   * @param pluralText - Plural text
   * @param number - (e.g. for English 1 is singular)
   * @returns String into current language
   */
  function TranslatePluralWithContext(
    context: string,
    singularText: string,
    pluralText: string,
    number: number
  ): string;

  /**
   * Translate the text line by line.
   * @param text - Multiline text
   * @returns Translated multiline text.
   */
  function TranslateLines(text: string): string;

  /**
   * Return a translated version of the items in the specified array.
   * @param texts - Array of strings to translate
   */
  function TranslateArray(texts: string[]): string[];

  /**
   * Localized version of a time given in milliseconds.
   * @param dateMiliseconds - Date or number in miliseconds
   * @param formatString - Date format (e.g. "Y-M-d H:m")
   */
  function FormatMillisecondsIntoDateStringLocal(
    dateMiliseconds: number | Date,
    formatString: string
  ): string;

  /**
   * GMT version of a time given in milliseconds.
   * @param dateMiliseconds - Date or number in miliseconds
   * @param formatString - Date format (e.g. "Y-M-d H:m")
   */
  function FormatMillisecondsIntoDateStringGMT(
    dateMiliseconds: number | Date,
    formatString: string
  ): string;

  /**
   * Localized version of the given decimal number.
   * @param value - Number
   */
  function FormatDecimalNumberIntoString(value: number): string;

  /**
   * Returns an array of supported locale codes sorted alphabetically.
   *
   * A locale code is a string such as "de" or "pt_BR".
   *
   * If yours is a development copy (the ‘config/dev.cfg’ file is found in the
   * virtual filesystem), the output array may include the special “long”
   * locale code.
   * @see http://trac.wildfiregames.com/wiki/Implementation_of_Internationalization_and_Localization#LongStringsLocale
   * @returns Array of supported locale codes.
   */
  function GetSupportedLocaleBaseNames(): string[];

  /**
   * Returns an array of supported locale names sorted alphabetically by
   * locale code.
   *
   * A locale code is a string such as "de" or "pt_BR".
   *
   * If yours is a development copy (the ‘config/dev.cfg’ file is found in the
   * virtual filesystem), the output array may include the special “Long
   * Strings” locale name.
   * @see http://trac.wildfiregames.com/wiki/Implementation_of_Internationalization_and_Localization#LongStringsLocale
   * @return Array of supported locale codes.
   */
  function GetSupportedLocaleDisplayNames(): string[];

  /**
   * Returns the current locale.
   */
  function GetCurrentLocale(): string;

  /**
   * Returns a vector of locale codes supported by ICU.
   *
   * A locale code is a string such as "de" or "pt_BR".
   * @see http://www.icu-project.org/apiref/icu4c/classicu_1_1Locale.html#a073d70df8c9c8d119c0d42d70de24137
   * @returns Array of supported locale codes
   */
  function GetAllLocales(): string[];

  /**
   * Returns the code of the recommended locale for the current user that the
   * game supports.
   *
   * “That the game supports” means both that a translation file is available
   * for that locale and that the locale code is either supported by ICU or
   * the special “long” locale code.
   *
   * The mechanism to select a recommended locale follows this logic:
   *     1. First see if the game supports the specified locale,
   *       @p configLocale.
   *     2. Otherwise, check the system locale and see if the game supports
   *       that locale.
   *     3. Else, return the default locale, ‘en_US’.
   *
   * @param configLocaleString Locale to check for support first. Pass an
   *        empty string to check the system locale directly.
   * @returns Code of a locale that the game supports.
   *
   * @see http://trac.wildfiregames.com/wiki/Implementation_of_Internationalization_and_Localization#LongStringsLocale
   */
  function GetDictionaryLocale(configLocaleString: string): string;

  /**
   * Returns an array of paths to files in the virtual filesystem that provide
   * translations for the specified locale code.
   *
   * @param locale Locale code.
   * @return Array of paths to files in the virtual filesystem that provide
   * translations for @p locale.
   */
  function GetDictionariesForLocale(locale: string): string[];

  /**
   * Returns true if the current locale is the special “Long Strings”
   * locale. It returns false otherwise.
   *
   * @return Whether the current locale is the special “Long Strings”
   *         true or not (false).
   */
  function UseLongStrings(): boolean;

  /**
   * Returns the ISO-639 language code of the specified locale code.
   *
   * For example, if you specify the ‘en_US’ locate, it returns ‘en’.
   *
   * @param locale Locale code.
   * @return Language code.
   *
   * @see http://www.icu-project.org/apiref/icu4c/classicu_1_1Locale.html#af36d821adced72a870d921ebadd0ca93
   */
  function GetLocaleLanguage(locale: string): string;

  /**
   * Returns the programmatic code of the entire locale without keywords.
   *
   * @param locale Locale code.
   * @return Locale code without keywords.
   *
   * @see http://www.icu-project.org/apiref/icu4c/classicu_1_1Locale.html#a4c1acbbdf95dc15599db5f322fa4c4d0
   */
  function GetLocaleBaseName(locale: string): string;

  /**
   * Returns the ISO-3166 country code of the specified locale code.
   *
   * For example, if you specify the ‘en_US’ locate, it returns ‘US’.
   *
   * @param locale Locale code.
   * @return Country code.
   *
   * @see http://www.icu-project.org/apiref/icu4c/classicu_1_1Locale.html#ae3f1fc415c00d4f0ab33288ceadccbf9
   */
  function GetLocaleCountry(locale: string): string;

  /**
   * Returns the ISO-15924 abbreviation script code of the specified locale code.
   *
   * @param locale Locale code.
   * @return Script code.
   *
   * @see http://www.icu-project.org/apiref/icu4c/classicu_1_1Locale.html#a5e0145a339d30794178a1412dcc55abe
   */
  function GetLocaleScript(locale: string): string;

  function GetFallbackToAvailableDictLocale(locale: string): string;

  /**
   * Returns  true if the locale is supported by both ICU and the game. It
   * returns  false otherwise.
   *
   * It returns  true if both of these conditions are true:
   *     1. ICU has resources for that locale (which also ensures it’s a valid\n
   *       locale string).
   *     2. Either a dictionary for language_country or for language is\n
   *       available.
   *
   * @param locale Locale to check.
   * @return Whether `locale` is supported by both ICU and the game (true)
   *         or not (false).
   */
  function ValidateLocale(locale: string): boolean;

  /**
   * Saves the specified locale in the game configuration file.
   *
   * The next time that the game starts, the game uses the locale in the
   * configuration file if there are translation files available for it.
   *
   * SaveLocale() checks the validity of the specified locale with
   * ValidateLocale(). If the specified locale is not valid, SaveLocale()
   * returns false and does not save the locale to the configuration file.
   *
   * This is a JavaScript interface to L10n::SaveLocale().
   *
   * @param locale Locale to save to the configuration file.
   * @return Whether the specified locale is valid (true) or not
   *         (false).
   */
  function SaveLocale(locale: string): boolean;

  /**
   * Determines the best, supported locale for the current user, makes it the
   * current game locale and reloads the translations dictionary with
   * translations for that locale.
   *
   * To determine the best locale, ReevaluateCurrentLocaleAndReload():
   *     1. Checks the user game configuration.
   *     2. If the locale is not defined there, it checks the system locale.
   *     3. If none of those locales are supported by the game, the default\n
   *       locale, ‘en_US’, is used.
   */
  function ReevaluateCurrentLocaleAndReload(): void;

  /**
   * Is Xmpp client active (player inside lobby).
   */
  function HasXmppClient(): boolean;

  /**
   * Is the game ranked.
   */
  function IsRankedGame(): Boolean;

  /**
   * Set the game as ranked.
   */
  function SetRankedGame(): any;

  /**
   * Start the XMPP client.
   *
   * @param username Username to login with
   * @param password Password to login with
   * @param room MUC room to join
   * @param nick Nick to join with
   * @param historyRequestSize Number of stanzas of room history to request
   */
  function StartXmppClient(
    username: string,
    password: string,
    room: string,
    nick: string,
    historyRequestSize: number
  ): void;

  /**
   * Register as XMPP client.
   *
   * @param username Username to login with
   * @param password Password to login with
   */
  function StartRegisterXmppClient(username: string, password: string): void;

  /**
   * Stop XMPP client.
   */
  function StopXmppClient(): void;

  /**
   * Connect XMPP client (enter the lobby).
   */
  function ConnectXmppClient(): void;

  /**
   * Disconnect XMPP client (leave the lobby).
   */
  function DisconnectXmppClient(): void;

  /**
   * Check XMPP client is connected (in the lobby).
   */
  function IsXmppClientConnected(): boolean;

  /**
   * Request the leaderboard data from the server.
   */
  function SendGetBoardList(): void;

  /**
   * Request the profile data from the server.
   * @param playerName - Name of the player
   */
  function SendGetProfile(playerName: string): void;

  /**
   * Send a request to register a game to the server.
   * @param data A JS object with data of game attributes
   */
  function SendRegisterGame(data: object): void;

  /**
   * Send game report containing numerous game properties to the server.
   * @param data A JS object of game statistics
   */
  function SendGameReport(data: object): void;

  /**
   * Send a request to unregister a game to the server.
   */
  function SendUnregisterGame(): void;

  /**
   * Send a request to change the state of a registered game on the server.
   *
   * A game can either be in the 'running' or 'waiting' state - the server
   * decides which - but we need to update the current players that are
   * in-game so the server can make the calculation.
   * @param nbp - Number of players (no observers) currently connected in the game
   * @param players - JSON list of players by team + observers
   * @see playerDataToStringifiedTeamList
   * @see formatClientsForStanza
   */
  function SendChangeStateGame(nbp: string, players: string): void;

  /**
   * Array containing all known players and their presences (lobby)
   */
  function GetPlayerList(): {
    name: string;
    presense: string;
    rating: string;
    role: string;
  }[];

  /**
   * Clears all presence updates from the message queue.
   * Used when rejoining the lobby, since we don't need to handle past presence changes.
   */
  function LobbyClearPresenceUpdates(): void;

  /**
   * Requests for the list of all active games.
   * @return Array of game each as an object with details of the game
   */
  function GetGameList():
    | undefined
    | {
        name: string;
        ip: string;
        port: string;
        stunIP: string;
        stunPort: string;
        hostUsername: string;
        state: string;
        nbp: string;
        maxnbp: string;
        players: string;
        mapName: string;
        niceMapName: string;
        mapSize: string;
        mapType: string;
        victoryCondition: string;
        startTime: string;
        mods: string;
      }[];

  /**
   * Gets received data from last SendGetBoardList call.
   * @return Array of players data in the leaderboard
   */
  function GetBoardList():
    | undefined
    | {
        name: string;
        rank: string;
        rating: string;
      }[];

  /**
   * Gets received data from last SendGetProfile call.
   * @return Array of players data in the leaderboard
   */
  function GetProfile():
    | undefined
    | {
        player: string;
        rating: string;
        totalGamesPlayed: string;
        highestRating: string;
        wins: string;
        losses: string;
        rank: string;
      }[];

  /**
   * Poll to get lobby new messages.
   * The object might contain extra properties not defined here.
   * @returns Oldest message waiting to be polled.
   *
   * Possibles return combinations here:
   *
   * TYPE, LEVEL, PropName1, PropName2
   * -------------------------
   * system, connected
   * system, disconnected, reason
   * system, registered
   * system, error, text
   * chat, private-message, from, text
   * chat, room-message, from, text
   * chat, nick, oldnick, newnick
   * chat, kicked, nick, reason
   * chat, banned, nick, reason
   * chat, leave, nick
   * chat, join, nick
   * chat, role, nick, oldrole
   * chat, presence, nick
   * chat, subject, nick, subject
   * game, gamelist
   * game, leaderboard
   * game, ratinglist
   * game, profile
   */
  function LobbyGuiPollNewMessage():
    | undefined
    | {
        type: "system";
        level: "connected" | "disconnected" | "error" | "registered";
        reason?: string;
        text?: string;
        historic: false;
        time: number;
      }
    | {
        type: "chat";
        level:
          | "nick"
          | "kicked"
          | "banned"
          | "leave"
          | "join"
          | "role"
          | "presence"
          | "subject"
          | "private-message"
          | "room-message";
        from?: string;
        text?: string;
        oldnick?: string;
        newnick?: string;
        role?: string;
        oldrole?: string;
        reason?: string;
        subject?: string;
        historic: false;
        time: number;
      }
    | {
        type: "game";
        level: "gamelist" | "leaderboard" | "ratinglist" | "profile";
        historic: false;
        time: number;
      };

  /**
   * Retuns histic messages.
   * Each key entry represents a message.
   * Only normal chat messages will returned.
   */
  function LobbyGuiPollHistoricMessages(): undefined | object;

  /**
   * Sends the user message to the lobby.
   */
  function LobbySendMessage(message: string): void;

  function LobbySetPlayerPresence(): any;
  function LobbySetNick(): any;
  function LobbyGetNick(): any;
  function LobbyKick(): any;
  function LobbyBan(): any;
  function LobbyGetPlayerPresence(): any;
  function LobbyGetPlayerRole(): any;
  function EncryptPassword(): any;
  function LobbyGetRoomSubject(): any;
  function Exit(): any;
  function RestartInAtlas(): any;
  function AtlasIsAvailable(): any;
  function IsAtlasRunning(): any;
  function OpenURL(url: string): string;
  function GetSystemUsername(): any;
  function GetMatchID(): any;
  function LoadMapSettings(): any;
  function HotkeyIsPressed(): any;
  function GetFPS(): any;
  function GetTextWidth(): any;
  function CalculateMD5(): any;
  function GetEngineInfo(): any;
  function GetAvailableMods(): any;
  function RestartEngine(): any;
  function SetMods(): any;
  function ModIoStartGetGameId(): any;
  function ModIoStartListMods(): any;
  function ModIoStartDownloadMod(): any;
  function ModIoAdvanceRequest(): any;
  function ModIoCancelRequest(): any;
  function ModIoGetMods(): any;
  function ModIoGetDownloadProgress(): any;
  function GetDefaultPort(): any;
  function HasNetServer(): any;
  function HasNetClient(): any;
  function FindStunEndpoint(): any;
  function StartNetworkHost(): any;
  function StartNetworkJoin(): any;
  function DisconnectNetworkGame(): any;
  function GetPlayerGUID(): any;
  function PollNetworkClient(): any;
  function SetNetworkGameAttributes(): any;
  function AssignNetworkPlayer(): any;
  function KickPlayer(): any;
  function SendNetworkChat(): any;
  function SendNetworkReady(): any;
  function ClearAllPlayerReady(): any;
  function StartNetworkGame(): any;
  function SetTurnLength(): any;
  function Renderer_GetRenderPath(): any;
  function Renderer_SetRenderPath(): any;
  function Renderer_RecreateShadowMap(): any;
  function TextureExists(): any;
  function Renderer_GetShadowsEnabled(): any;
  function Renderer_SetShadowsEnabled(): any;
  function Renderer_GetShadowPCFEnabled(): any;
  function Renderer_SetShadowPCFEnabled(): any;
  function Renderer_GetParticlesEnabled(): any;
  function Renderer_SetParticlesEnabled(): any;
  function Renderer_GetPreferGLSLEnabled(): any;
  function Renderer_SetPreferGLSLEnabled(): any;
  function Renderer_GetWaterEffectsEnabled(): any;
  function Renderer_SetWaterEffectsEnabled(): any;
  function Renderer_GetWaterFancyEffectsEnabled(): any;
  function Renderer_SetWaterFancyEffectsEnabled(): any;
  function Renderer_GetWaterRealDepthEnabled(): any;
  function Renderer_SetWaterRealDepthEnabled(): any;
  function Renderer_GetWaterReflectionEnabled(): any;
  function Renderer_SetWaterReflectionEnabled(): any;
  function Renderer_GetWaterRefractionEnabled(): any;
  function Renderer_SetWaterRefractionEnabled(): any;
  function Renderer_GetWaterShadowsEnabled(): any;
  function Renderer_SetWaterShadowsEnabled(): any;
  function Renderer_GetFogEnabled(): any;
  function Renderer_SetFogEnabled(): any;
  function Renderer_GetSilhouettesEnabled(): any;
  function Renderer_SetSilhouettesEnabled(): any;
  function Renderer_GetShowSkyEnabled(): any;
  function Renderer_SetShowSkyEnabled(): any;
  function Renderer_GetSmoothLOSEnabled(): any;
  function Renderer_SetSmoothLOSEnabled(): any;
  function Renderer_GetPostprocEnabled(): any;
  function Renderer_SetPostprocEnabled(): any;
  function Renderer_GetDisplayFrustumEnabled(): any;
  function Renderer_SetDisplayFrustumEnabled(): any;
  function GetSavedGames(): any;
  function DeleteSavedGame(): any;
  function SaveGame(): any;
  function SaveGamePrefix(): any;
  function QuickSave(): any;
  function QuickLoad(): any;
  function StartSavedGame(): any;
  function GetInitAttributes(): any;
  function GuiInterfaceCall(): any;
  function PostNetworkCommand(): any;
  function DumpSimState(): any;
  function GetAIs(): any;
  function PickEntityAtPoint(): any;
  function PickPlayerEntitiesInRect(): any;
  function PickPlayerEntitiesOnScreen(): any;
  function PickNonGaiaEntitiesOnScreen(): any;
  function PickSimilarPlayerEntities(): any;
  function SetBoundingBoxDebugOverlay(): any;
  function StartMusic(): any;
  function StopMusic(): any;
  function ClearPlaylist(): any;
  function AddPlaylistItem(): any;
  function StartPlaylist(): any;
  function PlayMusic(): any;
  function PlayUISound(): any;
  function PlayAmbientSound(): any;
  function MusicPlaying(): any;
  function SetMasterGain(): any;
  function SetMusicGain(): any;
  function SetAmbientGain(): any;
  function SetActionGain(): any;
  function SetUIGain(): any;
  function IsUserReportEnabled(): any;
  function SetUserReportEnabled(): any;
  function GetUserReportStatus(): any;
  function GetUserReportLogPath(): any;
  function GetUserReportConfigPath(): any;
  function GetFileMTime(): any;
  function GetFileSize(): any;
  function ReadFile(): any;
  function ReadFileLines(): any;
  function WriteJSONFile(filePath: string, JSONObject: object): void;
  function GetReplays(): any;
  function DeleteReplay(): any;
  function StartVisualReplay(): any;
  function GetReplayAttributes(): any;
  function GetReplayMetadata(): any;
  function HasReplayMetadata(): any;
  function AddReplayToCache(): any;
  function GetReplayDirectoryName(): any;

  function SetGlobalHotkey(
    hotkey: String,
    eventType:
      | "Press"
      | "Tab"
      | "KeyDown"
      | "MouseWheelUp"
      | "MouseWheelDown"
      | "Tick",
    eventCallback: Function
  ): void;

  function UnsetGlobalHotkey(
    hotkey: String,
    eventType:
      | "Press"
      | "Tab"
      | "KeyDown"
      | "MouseWheelUp"
      | "MouseWheelDown"
      | "Tick"
  ): void;
}

declare class GUIObject
{
	hidden: boolean
	caption: string
	children: GUIObject[]
	size: GUISize
	getComputedSize(): GUISize
}

declare enum GUISizeSide
{
	left = "left",
	right = "right",
	top = "top",
	bottom = "bottom",
	rleft = "rleft",
	rright = "rright",
	rtop = "rtop",
	rbottom = "rbottom"
}

declare class GUISize
{
	[GUISizeSide.left]: number
	[GUISizeSide.right]: number
	[GUISizeSide.top]: number
	[GUISizeSide.bottom]: number
	[GUISizeSide.rleft]: number
	[GUISizeSide.rright]: number
	[GUISizeSide.rtop]: number
	[GUISizeSide.rbottom]: number
	width: number
	height: number
}

declare function setTimeout(callback: Function, time: number): void
declare function saveSettingAndWriteToUserConfig(key: string, value: string): void
