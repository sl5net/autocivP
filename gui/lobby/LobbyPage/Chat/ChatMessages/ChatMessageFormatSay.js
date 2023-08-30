/**
 * This class formats a chat message that was not formatted with any commands.
 * The nickname and the message content will be assumed to be player input, thus escaped,
 * meaning that one cannot use colorized messages here.
 */
class ChatMessageFormatSay
{
	constructor()
	{
		this.senderArgs = {};
		this.messageArgs = {};
	}

	/**
	 * Sender is formatted, escapeText is the responsibility of the caller.
	 */
	format(sender, text)
	{
		this.senderArgs.sender = sender;
		// warn(`20: sender is ${sender}`);
		this.messageArgs.message = text;

		// Remove color tags using regex

		let temp = `${sender}: ${text}`; // all senders. inclusive yourself
		// you could get it by pressing tab in a empty chat. so you could last message in your caption. then you could copy it. often missed opterionity to copy a text.
		// if you login in the lobby it reads all messages. later it readys the last message only

		if(Engine.ConfigDB_GetValue("user", "autocivP.chat.copyAllChatMessages") !== "true" )
			g_chatTextInInputFild_when_msgCommand = ''

		temp = temp.replace(/\[([^\[\]]*)\]/g, '') + "\n" ; // usually colors in usernames
		g_chatTextInInputFild_when_msgCommand += temp


		let bugIt = false // new implementation so i will watch longer
		bugIt = g_selfNick.includes("seeh") // new implementation so i will watch longer


		const ttsSolution = Engine.ConfigDB_GetValue("user", "autocivP.ttsSolution")
		if(ttsSolution == "autokeyTTS")
			ConfigDB_CreateAndSaveValueA26A27("user", `AudioTTS.speak`, temp.replace('\n', ' ').replace('"', '')); // just for fun experimental


		g_chatTextInInputFild_when_msgCommand_lines++

		// warn(`22: ${g_backupMessageBeforeChangeContextViaHotkey}`);

		this.messageArgs.sender = setStringTags(
			sprintf(this.ChatSenderFormat, this.senderArgs),
			this.SenderTags);

		return sprintf(this.ChatMessageFormat, this.messageArgs);
	}
}

ChatMessageFormatSay.prototype.ChatSenderFormat = translate("<%(sender)s>");

ChatMessageFormatSay.prototype.ChatMessageFormat = translate("%(sender)s %(message)s");

/**
 * Used for highlighting the sender of chat messages.
 */
ChatMessageFormatSay.prototype.SenderTags = {
	"font": "sans-stroke-16"
};
