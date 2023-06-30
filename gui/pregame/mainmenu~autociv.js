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
    if (this.needsToReloadHotkeys) Engine.ReloadHotkeys();
  },
};

function autociv_initCheck() {
  let state = {
    reasons: new Set(),
    showReadme: false,
    showSuggestDefaultChanges: false,
    showAutoFixModsOrder: false,
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
  const posautociv = modsFromUserCfg_const.indexOf('autociv')


  if (false && state.showAutoFixModsOrder
    && posboonGUI > posautociv
    ) {

      ConfigDB_CreateAndSaveValueA26A27('mod.enabledmods',modsBackup)

      error('posboonGUI > posautociv');


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
          warn(
            "not implemented at the moment. pleas ask/remindMe later for it 23-0630_1227-13"
          );
          config.save();
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

function saveThisModProfile(nr, autoLabelManually) {
  const modsFromUserCfg_const = Engine.ConfigDB_GetValue(
    "user",
    "mod.enabledmods"
  );
  const name = "modProfile.p" + nr;
  const modProfile = Engine.ConfigDB_GetValue("user", name);
  const nameLabel = "modProfile.p" + nr + "label";

  // warn("check if ModProfiles has changed")

  if (!modProfile) {
    // warn("133")
    let clean = "";
    switch (nr) {
      case 0: // p0
        clean = modsFromUserCfg_const.replaceAll(/[^\w\d\-]+/g, " ");
        break;
      case 1:
        clean = "autociv LocalRatings-master better_summary_charts";
        break;
      case 2:
        clean = "community-mod feldmap autociv better_summary_charts";
        break;
      case 3:
        clean = "LocalRatings-master better_summary_charts";
        break;
      case 4:
        clean = "community-maps-2 kush-extreme 10ad autociv";
        break;
      case 4:
        clean = "mainland-twilight autociv LocalRatings-master ";
        break;
    }
    clean = clean.replaceAll(/\b((mod\s+public)|autocivP)\b\s*/g, ""); // mod\s+public is default. boring to save it

    Engine.ConfigDB_WriteValueToFile("user", name, clean, "config/user.cfg"); // fill it if its empty

    const cleanLabel = clean.replaceAll(/([^ ]{3})[^ ]+/g, "$1");
    Engine.ConfigDB_WriteValueToFile(
      "user",
      nameLabel,
      cleanLabel,
      "config/user.cfg"
    ); // fill it if its empty
    Engine.ConfigDB_CreateValue("user", nameLabel, cleanLabel);
  } else {
    let clean = modProfile.replaceAll(/[^\w\d\-]+/g, " ");
    clean = clean.replaceAll(/\b((mod\s+public)|autocivP)\b\s*/g, ""); // mod\s+public is default. boring to save it

    // warn("146:" + modProfile)
    // warn("147:" + clean)
    if (clean != modProfile) {
      // correct profile if necesarry
      Engine.ConfigDB_WriteValueToFile("user", name, clean, "config/user.cfg"); //
      Engine.ConfigDB_CreateValue("user", name, clean); // to see it early in the memory
      warn("modProfile.p" + nr + " saved with =" + clean + "=");
    }

    if (!autoLabelManually) {
      const cleanLabel = clean.replaceAll(/([^ ]{3})[^ ]+/g, "$1");
      Engine.ConfigDB_WriteValueToFile(
        "user",
        nameLabel,
        cleanLabel,
        "config/user.cfg"
      ); // fill it if its empty
      Engine.ConfigDB_CreateValue("user", nameLabel, cleanLabel);

      warn("autoLabel" + nr + " saved with =" + cleanLabel + "=");
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
    let clean =
      "mod public " +
      modProfile.replaceAll(/\b((mod\s+public)|autocivP)\b\s*/g, " "); // mod\s+public is default. boring to save it
    clean =
      "mod public " +
      modProfile.replaceAll(/\b(mod\s+public)\b\s*/g, "") +
      " autocivP"; // mod\s+public is default. boring to save it in normal profiles. but dont forget it by enaable mods
    if (clean != modsFromUserCfg_const) {
      warn("save:" + nr);
      warn(clean);
      error("RESTART NECESSARY (seeh, 23-0630_1517-03)");
      error("RESTART NECESSARY (seeh, 23-0630_1517-03)");
      error("RESTART NECESSARY (seeh, 23-0630_1517-03)");
      error("RESTART NECESSARY (seeh, 23-0630_1517-03)");

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
      Engine.ConfigDB_WriteValueToFile(
        "user",
        "modProfile.backup",
        modsFromUserCfg_const,
        "config/user.cfg"
      );
      Engine.ConfigDB_WriteValueToFile(
        "user",
        "mod.enabledmods",
        clean,
        "config/user.cfg"
      );
      // return true;
      // state.needsRestart = true;
      // configSaveToMemoryAndToDisk(key, settings[key]);
      Engine.ConfigDB_CreateValue("user", "mod.enabledmods", clean);

      // Engine.SetMods(clean);

      // state.reasons.add("New mode-profile settings added.");

      // Engine.RestartInAtlas(1) // works. it start atlas
      // Engine.RestartInEngine(1) // is not a function
      // Engine.RestartEngine(1) // is not a funtion
      // Engine.RestartEngine.call(1) // is undefined


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
      //           Engine.Restart() // works
      //         },
      //         () => {},
      //       ]
      //     );
        try {
          Engine.Restart() // works sometimes Engine. and sometimes: Restart is not a function
        } catch (error) {
          Engine.Exit(1) // works
        }




      // Engine.Exit(1) // works

    } else {
      // warn("dont save " + nr);
    }
    return true;
  }
  return false;
}

function check_modProfileSelector_settings() {


  // Engine.Exit(1) // => works :)

  // Check settings
  const autoLabelManually =
    Engine.ConfigDB_GetValue("user", "modProfile.autoLabelManually") == "true";
  [...Array(6)].forEach((_, k0_5) =>
    saveThisModProfile(k0_5, autoLabelManually)
  );
  // return false;
  let k0_5 = -1;
  while (++k0_5 <= 5) {
    let nameOfCheckBox = "modProfile.p" + k0_5 + "enabled";
    if (Engine.ConfigDB_GetValue("user", nameOfCheckBox) == "true") {
      if (enableThisModProfile(k0_5)) {
        warn("" + k0_5 + " was enabled as your default mod-configuration.");
        Engine.ConfigDB_WriteValueToFile(
          "user",
          nameOfCheckBox,
          "false",
          "config/user.cfg"
        );
        Engine.ConfigDB_CreateValue("user", nameOfCheckBox, "false");
        warn(
          k0_5 +
            " checkBox disabled (if enabled have conflict with the normal mod selector)"
        );
        return true;
      }
      break;
    }
  }
  return false;
}

check_modProfileSelector_settings(); // info
