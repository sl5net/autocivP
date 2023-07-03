const key = "autocivP.gamesetup.restart"; // not needet try dont work in this case. use Engine.Exit(1) only
let helloAllText = Engine.ConfigDB_GetValue("user", key);
if(helloAllText == 'restart'){
  ConfigDB_CreateAndSaveValueA26A27("user", key, 'lalilu'); // should be a trick but restart not work if its from otther side. only if its the first call.
  try {
    Engine.Restart(1);
  } catch (error) {
    Engine.Exit(1)
  }
}

// Engine.GetGUIObjectByName("saveChanges").onPress = () => warn("saveChanges")

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
    //   Engine.Restart(1);
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
    let settings = Engine.ReadJSONFile("moddata/autocivP_default_config.json"); // https://www.convertsimple.com/convert-ini-to-json/ if u want use your user.cfg (seeh, 23-0619_1559-06 )
    // Reset all autociv settings to default. Custom autociv settings added won't be affected.


    if(config.get('modProfile.showAutoFixModsOrder') === "true")
      state.showAutoFixModsOrder = true


    if (config.get("autociv.settings.reset.all2P") === "true")
      settings = Engine.ReadJSONFile("moddata/autocivP_default_config.json"); // https://www.convertsimple.com/convert-ini-to-json/ if u want use your user.cfg (seeh, 23-0619_1559-06 )
    if (config.get("autociv.settings.reset.all") === "true") {
      warn("RESET ALL");
      for (let key in settings) config.set(key, settings[key]);
      config.save();
      state.reasons.add("AutoCiv settings reset by user.");
      return state;
    }

    const allHotkeys = new Set(Object.keys(Engine.GetHotkeyMap()));
    // Normal check. Check for entries missing
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

  // Check for showSuggestDefaultChanges
  {
    const key = "autociv.mainmenu.suggestDefaultChanges";
    if (config.get(key) == "true") {
      state.showSuggestDefaultChanges = true;
      config.set(key, "false");
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
    let message = ["AutoCiv made some changes.\n"]
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

  const posboonGUI = modsFromUserCfg_const.indexOf('boonGUI')
  const posproGUI = modsFromUserCfg_const.indexOf('proGUI')



  if (true && state.showAutoFixModsOrder
    && posboonGUI < posproGUI
    ) {

      ConfigDB_CreateAndSaveValueA26A27("user", 'mod.enabledmods',modsBackup)

    let message = `
Mods sometimes work better when enabled in a special order.

Example of Jun  2023:
errors with boonGui when  enabled late but
nearly no errors when autocivP or autociv are enabled later.
in other words
boonGUI autociv... works better then autociv... boonGUI at the moment (Jun 2023)

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

          try {
            Engine.Restart(1);
          } catch (error) {
            Engine.Exit(1)
          }



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
