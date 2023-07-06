const versionOf0ad = Engine.GetEngineInfo().mods[0]['version']; // 0.0.26
autociv_patchApplyN(HotkeysPage.prototype, "saveUserHotkeys", function (target, that, args)
{
    const res = target.apply(that, args);

    let temp = {}
    for (let hotkey in that.hotkeys) if (hotkey.startsWith("autociv."))
    {
        temp[hotkey] = that.hotkeys[hotkey];
        Engine.ConfigDB_RemoveValue("user", "hotkey." + hotkey);
    }

    Engine.ReloadHotkeys();
    for (let hotkey in temp)
    {
        let keymap = formatHotkeyCombinations(temp[hotkey], false);
        Engine.ConfigDB_CreateValues("user", "hotkey." + hotkey, keymap);
    }
    try {
        if(versionOf0ad != '0.0.26')
            Engine.ConfigDB_SaveChanges("user"); // a27 style
        else
            Engine.ConfigDB_WriteFile("user", "config/user.cfg") // a26 style
    } catch (error) {
        Engine.ConfigDB_WriteFile("user", "config/user.cfg") // a26 style
        warn('this will never happen .')
    }


    Engine.ReloadHotkeys();

    return res;
})
