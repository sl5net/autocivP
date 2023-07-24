/*!SECTIONS
const versionOf0ad = Engine.GetEngineInfo().mods[0]['version']; // 0.0.26

probably not needed here anymore, becouse of this 23-0724_1503-25
TIMER| hotkeys/sprites.xml: 39.13 us
ERROR: JavaScript error: gui/hotkeys/HotkeysPage~autociv.js line 1
redeclaration of const versionOf0ad
  @gui/hotkeys/HotkeysPage~autociv.js:1:1
  onPress@gui/pregame/MainMenuItems.js:225:13
  performButtonAction@gui/pregame/MainMenuItemHandler.js:77:9
  pressButton@gui/pregame/MainMenuItemHandler.js:63:10
TIMER| hotkeys/hotkeys.xml: 59.0303 ms
*/


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
