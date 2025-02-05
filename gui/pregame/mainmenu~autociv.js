
var config = {
  needsToSave: false,
  needsToReloadHotkeys: false,
  set: function (key, value) {
    Engine.ConfigDB_CreateValue("user", key, value);
    this.needsToSave = true;
    this.needsToReloadHotkeys =
      this.needsToReloadHotkeys || key.startsWith("hotkey.");
  },
  get: function (key) {
    return Engine.ConfigDB_GetValue("user", key);
  },
  save: function () {
    if (this.needsToSave) {
      try {
        Engine.ConfigDB_SaveChanges("user"); // this is A27 style
      } catch (error) {
        Engine.ConfigDB_WriteFile("user", "config/user.cfg"); // this is A26 style
      }
    }

    // restart
    // try {
    //   Engine.SetModsAndRestartEngine(["mod",...Engine.GetEnabledMods()]);
    // } catch (error) {
    //   Engine.Exit(1);
    // }



    if (this.needsToReloadHotkeys) Engine.ReloadHotkeys();
  },
};

function autociv_initCheck() {
  let state = {
    reasons: new Set(),
    showReadme: false,
    showSuggestDefaultChanges: false,
    showAutoFixModsOrder: true,
  };

  // Check settings
  {
    let settings
    if(revisionNumber>=27)
      settings = Engine.ReadJSONFile("moddata/autocivP_default_config.json"); // https://www.convertsimple.com/convert-ini-to-json/ if u want use your user.cfg (seeh, 23-0619_1559-06 )
    else
      settings = Engine.ReadJSONFile("autociv_data/autocivP_default_config.json"); // https://www.convertsimple.com/convert-ini-to-json/ if u want use your user.cfg (seeh, 23-0619_1559-06 )


    // Reset all autociv settings to default. Custom autociv settings added won't be affected.


    if(config.get('modProfile.showAutoFixModsOrder') === "true")
      state.showAutoFixModsOrder = true


    if (config.get("autociv.settings.reset.all2P") === "true"){

      if(revisionNumber>=27)
        settings = Engine.ReadJSONFile("moddata/autocivP_default_config.json"); // https://www.convertsimple.com/convert-ini-to-json/ if u want use your user.cfg (seeh, 23-0619_1559-06 )
      else
        settings = Engine.ReadJSONFile("autociv_data/autocivP_default_config.json"); // https://www.convertsimple.com/convert-ini-to-json/ if u want use your user.cfg (seeh, 23-0619_1559-06 )
    }

      if (config.get("autociv.settings.reset.all") === "true"
     || config.get("autociv.settings.reset.all2P") === "true"
    ) {
      warn("RESET ALL");
      for (const key in settings){
        const value = settings[key]
        // warn(`settings[key] = ${settings[key]}`)
        if(!(config.get("autociv.settings.reset.allowSuperKey") === "true")
          && value.length > 4 && value.includes('Super+'))
          {
            warn("Super key not allowed. You need allow SuperKey explicitly in your settings.");
            continue
          }
        config.set(key, value);
      }
      config.save();
      state.reasons.add("AutoCiv settings reset by user.");
      return state;
    }

    const allHotkeys = new Set(Object.keys(Engine.GetHotkeyMap()));
    // Normal check. Check for entries missing
    // if(g_selfNick =="seeh"){ //NOTE -developers want to see the error in the console
    //   warn('95: Normal check. Check for entries missing')
    // }

   if(false) {
    for (let key in settings) {
      if (key.startsWith("hotkey.")) {
        if (!allHotkeys.has(key.substring("hotkey.".length))) {
          config.set(key, settings[key]);
          state.reasons.add("New AutoCiv hotkey(s) added.");
        }
      } else if (config.get(key) == "") {
        config.set(key, settings[key]);
        state.reasons.add("New AutoCiv setting(s) added.");
      }
    }
  }


  }

  // Check for showSuggestDefaultChanges
  if(false) {
    {
    const key = "autociv.mainmenu.suggestDefaultChanges";
    if (config.get(key) == "true") {
      state.showSuggestDefaultChanges = true;
      config.set(key, "false");
    }
  }
  }

  // Check if show readme (first time user case)
  {
    const key = "autociv.settings.autociv_readme.seen";
    if (config.get(key) == "false") {
      state.showReadme = true;
      config.set(key, "true");
    }
  }

  config.save();
  return state;
}

Engine.SetGlobalHotkey("autociv.open.autociv_readme", "Press", () => {
  Engine.PushGuiPage("page_autociv_readme.xml");
});

autociv_patchApplyN("init", function (target, that, args) {
  let state = autociv_initCheck();
  if (state.reasons.size != 0) {
    let message = ["AutoCivP made some changes.\n"]
      .concat(Array.from(state.reasons).map((v) => ` · ${v}`))
      .join("\n");

    messageBox(
      500,
      300,
      message,
      "AutoCiv mod notice",
      ["Ok"],
      [() => {}, () => {}]
    );
  }


  const modsFromUserCfg_const = Engine.ConfigDB_GetValue(
    "user",
    "mod.enabledmods"
  );

  const modsBackup  = Engine.ConfigDB_GetValue(
    "user",
    "modProfile.backup "
  );

  const posProGUI = modsFromUserCfg_const.indexOf('proGUI')
  const posBoonGUI = modsFromUserCfg_const.indexOf('boonGUI')
  const posAutocivP = modsFromUserCfg_const.indexOf('autocivp')

  if (g_selfNick =="seeh" && state.showAutoFixModsOrder) { // quick lazy quick fix. TODO: fix this should be a in the options somwehere maybe

// some here like silhouettes true is much important for fair playing

ConfigDB_CreateAndSaveValueA26A27("user", "chat.timestamp", false);
ConfigDB_CreateAndSaveValueA26A27("user", "gui.session.timeelapsedcounter", true);
ConfigDB_CreateAndSaveValueA26A27("user", "gui.session.attackrange", true); // fairplay. its helps
ConfigDB_CreateAndSaveValueA26A27("user", "gui.session.aurasrange ", true); // fairplay. its helps
ConfigDB_CreateAndSaveValueA26A27("user", "overlay.realtime", false);
ConfigDB_CreateAndSaveValueA26A27("user", "autociv.session.playersOverlay.visible", true);
ConfigDB_CreateAndSaveValueA26A27("user", "autociv.session.statsOverlay.visible", false);
ConfigDB_CreateAndSaveValueA26A27("user", "session.showobservers", true);
ConfigDB_CreateAndSaveValueA26A27("user", "session.showstats", false);
ConfigDB_CreateAndSaveValueA26A27("user", "silhouettes", true);



    }



    // autocivP should be later than proGUI becouse the sepezial customr rating that should make the use use of proGUI visible 23-0722_1318-16
    // ConfigDB_CreateAndSaveValueA26A27("user", "customrating.readme_seen", true);

    // mod.enabledmods = "mod public kush-extreme localratings feldmap autocivp community-maps-2 10ad proGUI"



    function getRevisionNumber(versionString) {
      const match = versionString.match(/(\d{2})/); // Matches 2 digits
      return match[1];
    }
    const revisionNumber = getRevisionNumber(versionOf0ad);
  // add feldmap automatically when feldmal not exist and versionOf0ad < 27
  // "0.0.26", "0.27.0", or "0.0.28", etc.
  if (revisionNumber < 27 ){
    const modsFromUserCfg_backup = Engine.ConfigDB_GetValue("user", "autocivP.enabledmods.backup");
    let clean = modsFromUserCfg_const
    if( modsFromUserCfg_const.indexOf("feldmap") === -1
    && modsFromUserCfg_backup.indexOf("feldmap") > 0)
      clean += ' feldmap'

    if( modsFromUserCfg_const.indexOf("proGUI_0.6.12") === -1
    && modsFromUserCfg_backup.indexOf("proGUI_0.6.12") > 0){
      clean = clean.replace(/\bautocivp\b/gi, '');
      clean += ' proGUI_0.6.12 autocivp'
    }
    clean = clean.replace(/\bautocivp\b/gi, '');
    if(clean != modsFromUserCfg_const){
      ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods',clean)
      const clean_array = clean.trim().split(/\s+/);
      Engine.SetModsAndRestartEngine(["mod",...clean_array])
    }
} else{
  const march2025 = new Date(2025, 2, 1);
  const currentDate = new Date();
  if (revisionNumber >= 28){

    let clean = modsFromUserCfg_const

    if( modsFromUserCfg_backup.indexOf("autocivp") > 0)
      clean = clean.replace(/\bautocivp\b/gi, 'autocivp');

    if( modsFromUserCfg_const.indexOf("feldmap") !== -1 && currentDate < march2025 ) {
      clean = clean.replace(/\bfeldmap\b/gi, '');

    clean = clean.replace(/\bproGUI_0\.6\.12\b/gi, '');

    ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods',clean)
    const clean_array = clean.trim().split(/\s+/);
    Engine.SetModsAndRestartEngine(["mod",...clean_array])
}}}




    if (true && posAutocivP < posProGUI) { // autocivP should be later than proGUI becouse the sepezial customrrating that should make the use use of proGUI visible 23-0722_1318-16

      warn(`posAutocivP < posProGUI = ${posAutocivP} < ${posProGUI}`)


      let clean = modsFromUserCfg_const
      /*NOTE - Allowing folder names to have optional postfixes for increased flexibility. Note that this approach is not recommended but can provide a better overview in certain cases.
      */
      const regex = /\bproGUI(.*?)\b/gi;
      const match = clean.match(regex);
      const postFixProGui = (match && match[1]) ? match[1] : '';

      const pattern = new RegExp(`\\bproGUI${postFixProGui}\\b`, 'gi');
      warn(`pattern = ${pattern}`)
      clean = clean.replace(pattern, '');
      clean = clean.replace(/\bautocivP\b(.*?)/gi, `proGUI${postFixProGui} autocivp$1 `);

      warn(`modsFromUserCfg_const = \n${modsFromUserCfg_const}`)
      warn(`new clean = \n${clean}`)

      ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods', clean.trim())

      const key = "autocivP.reloadcount"
      let reloadcount = parseInt( Engine.ConfigDB_GetValue("user", key) ) ;
      reloadcount = (reloadcount) ? reloadcount + 1 : 1
      warn(`reloadcount1 = ${reloadcount}`)
      ConfigDB_CreateAndSaveValueA26A27("user", key, reloadcount)

      if(reloadcount <= 2){
          const clean_array = clean.trim().split(/\s+/);
          Engine.SetModsAndRestartEngine(["mod",...clean_array])
          Engine.SetModsAndRestartEngine(["mod",...Engine.GetEnabledMods()])
      }else{
        warn(`Please reporte to the mod developer: reloadcount = ${reloadcount}`)
      }

    }else{
      const key = "autocivP.reloadcount"
      ConfigDB_CreateAndSaveValueA26A27("user", key, 0)
    }















  if (true && state.showAutoFixModsOrder
    && posBoonGUI > 1 && posBoonGUI < posProGUI
    ) {

      // ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods',modsBackup) // guess this was not needed or mistake also 23-0722_1314-58

    let message = `
Mods sometimes work better when enabled in a special order.

Example of Jun  2023:
proGUI should first then boonGUI last if you want boonGUI (Jun 2023)
Do you want autofix some think (no guaranty for all)?
        `;

    messageBox(
      500,
      300,
      message,
      "AutoCivP mod autoOrderFix notice",
      ["Ok, change", "No"],
      [
        () => {

          let clean = modsFromUserCfg_const

          clean = clean.replaceAll(/\bproGUI\b /g, '');
          clean = clean.replaceAll(/\bboonGUI\b /g, 'proGUI boonGUI ');
          ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods',clean)

          const clean_array = clean.split(/\s+/);
          Engine.SetModsAndRestartEngine(["mod",...clean_array])
          Engine.SetModsAndRestartEngine(["mod",...Engine.GetEnabledMods()])


        },
        () => {},
      ]
    );
  }

  if (state.showSuggestDefaultChanges) {
    let message = `
Some default settings will improve with AutoCiv if changed.

Do you want to make these changes?

Disable hotkey:
"hotkey.camera.lastattackfocus" = "Space"

Add auto-queue hotkeys:
hotkey.session.queueunit.autoqueueoff = "Alt+W"
hotkey.session.queueunit.autoqueueon = "Alt+Q"
        `;

    messageBox(
      500,
      300,
      message,
      "AutoCiv mod notice",
      ["Ok, change", "No"],
      [
        () => {
          config.set("hotkey.camera.lastattackfocus", "");
          config.set("hotkey.session.queueunit.autoqueueoff", "Alt+W");
          config.set("hotkey.session.queueunit.autoqueueon", "Alt+Q");
          config.save();
        },
        () => {},
      ]
    );
  }

  if (state.showReadme) Engine.PushGuiPage("page_autociv_readme.xml");

  return target.apply(that, args);
});

// warn('check_modProfile_Settings()');


check_modProfileSelector_settings();
