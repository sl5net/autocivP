autociv_patchApplyN("init", function (target, that, args)
{
    const res = target.apply(that, args);
    const [attribs] = args
    if (attribs.hasPassword)
    {
        let input = Engine.GetGUIObjectByName("clientPassword");
        input.blur()
        input.focus()
        input.buffer_position = input.caption.length;
        input.onPress = () => confirmPassword()
    }
    else if (attribs.multiplayerGameType == "host")
    {
        try {
            let input = Engine.GetGUIObjectByName("hostServerName");
            input.blur()
            input.focus()
            input.buffer_position = input.caption.length;
            // todo: fix this . works with mouse. its not really needed
            input.onPress = () => confirmSetup()
        } catch (error) {

        }
    }
    return res
})
