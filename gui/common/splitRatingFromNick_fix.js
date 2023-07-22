/**
 * Returns the nickname without the lobby rating.
 * This function is used in fgod and is buggy - I ask for fix fpre but he is reluctant  so at least anyone with this mode will not have any issue to see player in gamelist if changed rating to anything
 */
function splitRatingFromNick(playerName)
{
	//let result = /^(\S+)\ \((\d+)\)$/g.exec(playerName);
	//go2die - here fixing the selection of user with rating so in bracket can be anything instead of expected number
	let result = /^(\S+)\ \((.*)\)$/g.exec(playerName);
	return { "nick": result ? result[1] : playerName, "rating": result ? +result[2] : "" };
}
