
function init()
{
    Engine.GetGUIObjectByName("buttonWebpage").caption = Engine.Translate("Mod webpage")
    Engine.GetGUIObjectByName("buttonClose").caption = Engine.Translate("Close")
    Engine.GetGUIObjectByName("title").caption = Engine.Translate("Autociv readme")

    const webpageURL = "https://wildfiregames.com/forum/topic/107371-autocivp-add-ons-profiles-jitsi-team-call"
    Engine.GetGUIObjectByName("buttonWebpage").onPress = () => Engine.OpenURL(webpageURL)

    const markdown = Engine.ReadFile("moddata/autociv_README.md")
    Engine.GetGUIObjectByName("text").caption = autociv_SimpleMarkup(markdown)
}
