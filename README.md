# AutoCivP plus some goodies

Thanks to Nani ([most source is from Nani](https://github.com/nanihadesuka/autociv))

Thanks to all the 0 A.D. players who found it useful.

- General
	- Help command: type /help matchWord to see all available commands. Also possible to use regEx searchpattern.
	- Jitsi commands: type j<tab> to create and send a jitsi-audioChat-link
	- open links alias: type li<tab> to open a link.
 	- type <tab><tab> to see available commands that you have already used (history is saved into user.cfg).
	- some other little commands that works like: type command<tab>

- Wider Array of chat commands
- Jitsi  (Voice Chat)
	- it makes sure that all team members use the same jitsi-chat
- map-profiles ( https://wildfiregames.com/forum/uploads/monthly_2023_07/Screenshot_20230725_150411.jpg.a954e52a74bb8dd0400c20e205933b61.jpg )
- mod-profiles ( https://youtu.be/pt3VGm4N_Cw )
- use Symbols for some mod (not all are optional)
- Auto-save Drafts in Chat: Never Lose Your Message Again! when you use hotkey for toggle beetween allies-room to all-room content or back. This feature ensures that the content of a chat message is not lost if it has not been sent yet. Instead, the content is saved and can be retrieved even if the user navigates away from the chat screen before sending the message. This can be useful to prevent users from losing their work in progress.
- setup all defaults by type into the chat:
 feature value
- and More...


## Planned Features

- change the polar_sea time slices to other minues (e.g. from 15 to 5 Minutes)
- maybe rename it this mod to ProCommandLine with Symbold ♇ (PLine)
- maybe move it to gitlab

## Limitations

There is a limitation in the game where replays are not saved when you are the host of a team or 1v1 game. However, replays are saved when you join and play 1v1 games or team games.

## Questions & feedback
For more information, questions and feedback, visit the thread on the [0 A.D. forum](https://wildfiregames.com/forum/topic/107371-autociv-add-ons-profiles-jitsi-team-call).

# autoCivP and AutoCiv
## autoCivP

participation is welcome. are you a developer or want to become one?

This mod is an aggregation of features meant to enhance the 0 A.D. game experience. I usually implement these extra features as they come up with no general plan in mind.

## Feature list added by autocivP (most features from [autociv](https://github.com/nanihadesuka/autociv) )

- General
	- Help command: type /help matchWord to see all available commands. Also possible to use regEx searchpattern.
	- Jitsi commands: type j<tab> to create and send a jitsi-audioChat-link
	- open links alias: type li<tab> to open a link.
 	- type <tab><tab> to see available commands that you have already used (history is saved into user.cfg).
	- some other little commands that works like: type command<tab>
- Wider Array of chat commands
- Jitsi  (Voice Chat)
	- it makes sure that all team members use the same jitsi-chat
- map-profiles ( https://wildfiregames.com/forum/uploads/monthly_2023_07/Screenshot_20230725_150411.jpg.a954e52a74bb8dd0400c20e205933b61.jpg )
- mod-profiles ( https://youtu.be/pt3VGm4N_Cw )
- Auto-save Drafts in Chat: Never Lose Your Message Again! when you use hotkey for toggle beetween allies-room to all-room content or back. This feature ensures that the content of a chat message is not lost if it has not been sent yet. Instead, the content is saved and can be retrieved even if the user navigates away from the chat screen before sending the message. This can be useful to prevent users from losing their work in progress.
- setup all defaults by type into the chat:
 feature value
- and More...
## Planned Features

- change the polar_sea time slices to other minues (e.g. from 15 to 5 Minutes)
## Feature list Autociv
- General
	- Readme: press Shift + F4 to open
	- Player mute
	- Player reminder (show a written note when a certain player joins) ***
	- Link opener (opens URL links from the chat)
	- Help command: type /help to see all available commands
	- Console with autocomplete (Ctrl + C + L)
- Lobby
	- Resize bars
	- Host name mark
	- Remember playerlist state
	- Better performance when reloading lobby
	- Shortcuts to create host, navigate gamelist
	- Write s?search_text_here at the chat input to search lobby chat
- Game setup
	- Auto-assign civilization with chat (only works if host has the mod)
	- Custom population limit
	- Custom starting resources
	- Custom map size
	- Countdown to start the game
- Maps
	- Skirmish:
		- Volcano island (8)
- In Game
	- Hotkeys for (see hotkeys with hotkey viewer)
		- Buildings placement
			- Multiple buildings per hotkey (optional, user.cfg)
				- How to use: Copy the hotkey you want and remove the "hotkey." prefix, next replace the hotkey key for the buildings you want to cycle and separate them by a space.
		- Buildings selection
		- Units selection
		- Formations (selected units)
		- Stances (selected units)
		- Auto-train (selected buildings)
		- Minimap expand
		- Custom selection filters by:
			- health
			- rank
			- class
			- group
			- screen
	- Stats overlay
	- Pause game overlay now shows only in the top area
- Settings
	- Max corpses visible

## Download autocivP
- Download and install from the wildfiregames forum autociv page topic (files on first page)
	- not available jet
- Download and install manually the github repository (installation file on the releases section)
	- https://github.com/sl5net/autocivP
- Use 0 A.D. mod downloader (not always newest version)
	- https://0ad.mod.io/autocivP


## Instructions to install autociv manually
	#### MacOS (thanks @HMS-Surprise):
		https://wildfiregames.com/forum/index.php?/topic/25444-how-to-install-autociv-mod-on-mac/

	#### Linux/Windows:
		Open the downloaded file with (both ways should work):
		- pyromod file (two ways)
			- Double click the file (should autoinstall the mod for you and send  you to the mods page inside 0ad)
			- Right click → Open with → 0 A.D  (or pyrogenesis.exe)
		- zip file: Copy folder inside the zip file into your mods folder
			- https://trac.wildfiregames.com/wiki/GameDataPaths


## Mod autociv compatibility(s)
The mod is compatible with:
- 0 A.D 0.0.26 and 0 A.D 0.0.27
- Should work with all mods that don't have extensive code changes

## Questions & feedback
You don't understand how it works? Feeling confused? Just wanna comment? Ask and post.

## Contributing

1. Fork it.
2. Create a new feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git add .` and `git commit -m 'Add some feature'`
4. Push it to the branch: `git push fork my-new-feature`
5. Submit a pull request.


---

## Contributors

The motivation for this mod was implement ideas and simplifications that are helpful for this game and learn bit JavaScript.

- Helping with problems: @nani, @andy5995, @LangLangBart, @atric

- Thanks to modders:
  - @nani - [Autociv](https://github.com/nanihadesuka/autociv)
  - @Mentula - https://gitlab.com/mentula0ad
  - @Atric - https://gitlab.com/4trik
  - @LangLangBart - https://github.com/LangLangBart

- Thanks to all other modders
