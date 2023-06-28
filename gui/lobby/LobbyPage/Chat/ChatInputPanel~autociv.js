
ChatInputPanel.prototype.getAutocompleteList = function ()
{
    let list = []
    Array.prototype.push.apply(list, Engine.GetPlayerList().map(player => player.name))
    Array.prototype.push.apply(list, Engine.GetGameList().map(v => v.name))
    Array.prototype.push.apply(list, Object.keys(ChatCommandHandler.prototype.ChatCommands).map(v => `/${v}`))
    return list
}

ChatInputPanel.prototype.autocomplete = function ()
{
    // selfMessage('13 call autoCompleteText() ---------------')
    // try {
        autoCompleteText(this.chatInput, this.getAutocompleteList())
    // } catch (error) {
        // selfMessage('17: autoCompleteText failed ')
    // }
    // selfMessage('14 23-0628_0047-31')
}
