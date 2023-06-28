ChatInput.prototype.getAutocompleteList = function ()
{
    let list = []
    let playernames = Object.keys(g_PlayerAssignments).map(player => g_PlayerAssignments[player].name);
    Array.prototype.push.apply(list, playernames)
    Array.prototype.push.apply(list, Object.keys(g_NetworkCommands).filter(v => !!v))
    return list
}

ChatInput.prototype.autoComplete = function ()
{
    // selfMessage('11 call autoCompleteText() ---------------')
    // i i use try catch here then i crashes at the first try. so dont use try catch here. 23-0628_0131-59
    // try {
        autoCompleteText(this.chatInput, this.getAutocompleteList())
    // } catch (error) {
        // selfMessage('16: autoCompleteText failed')
    // }
    // selfMessage('13 llllllllllll')
}
