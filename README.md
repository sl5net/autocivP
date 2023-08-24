# ♇ AutoCivP plus some goodies

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

but no problem if you use from the newer releases :

...noMpJS... .zip

## Questions & feedback
For more information, questions and feedback, visit the thread on the [0 A.D. forum](https://wildfiregames.com/forum/topic/107371-autociv-add-ons-profiles-jitsi-team-call).
Best place for post issues here: https://github.com/sl5net/autocivP/issues/

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
- mod-profiles: don't need to change your map config anymore when we have changed our mod config: https://wildfiregames.com/forum/topic/107371-autocivp-add-ons-profiles-jitsi-team-call/#comment-553794
- Reuse Drafts: Your last chat message or the last chat message you received. Easy to select a portion and simple to copy. Type Tab in an empty chat.
- Auto-save Drafts in Chat: Never Lose Your Message Again! when you use hotkey for toggle beetween allies-room to all-room content or back. This feature ensures that the content of a chat message is not lost if it has not been sent yet. Instead, the content is saved and can be retrieved even if the user navigates away from the chat screen before sending the message. This can be useful to prevent users from losing their work in progress.
- setup all defaults by type into the chat:
 feature value
- and More...

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



### more intuitive hotkey feature (optional)

since 0ad A24 (was in other mod) intuitive hotkey feature are developed

#### you can't remember the hotkeys?
try this:

FirstLetter of the Building (press several times for toggling)
 ==> build the Building

Ctrl+FirstLetter of the Building
 ==> selects Building or the Buildings

ALT+FirstLetter of the Creature
 ==> selects Creature or Creatures

# intuitive h. examles:
space = jump/toggle last attack

## build examles:
```
space = jump/toggle last attack
h = build house
m = build markt
b = build backack
f = build farm
f,f = build farmstead
f,f,f = build fortress
.... etc. understand?
```

## select buildings examles:
```
space = jump/toggle last attack
ctrl+ h = select house
ctrl+ m = select markt
ctrl+ b = select backack
ctrl+ f = select farm
Ctrl+ s = select Storehouse Ship Stable ElephantStable Dock ...
... etc.
```
## select Creatures examles:
```
alt+W = select wimens
alt+I = select infrantrie
alt+P = select picmans
Alt+C = Cavalry
Alt+K = Catapult (exceptions becouse of conflict)
Alt+H = Healer
J = wounded (exceptions becouse near Healer)
.... etc. understand?
```

### exceptionally other spellings:

### this selects all >D<angerous E. archer-,war-,hero-Elephant,... (not Support&Elephant):
hotkey.autociv.session.entity.by.class.select.(Elephant)&!Support = "Alt+D"

### this selects only Support&Elephant (not all Elephant):
hotkey.autociv.session.entity.by.class.select.(Support&Elephant) = "Alt+E"

### select Barracks + ElephantStable + Stable) "Ctrl+X" (remember X like nearly everythink)
hotkey.autociv.session.entity.by.class.select.(Barracks|ElephantStable|Stable) = "Ctrl+X"

### select all military is of course Alt+M but also Alt+X (remember X like nearly everythink)
hotkey.autociv.session.entity.by.class.select.(Soldier|Siege|Dog)&!Ship = "Alt+M", "Alt+X"

### this selects only nowoundedonly using mouse (May think about oK. he is ok or so):
hotkey.autociv.selection.nowoundedonly = "K"

### this selects only woundedonly using mouse (think about: Lie down to bed better to geht healty again):
hotkey.selection.woundedonly = "L"

### dificult to remember: select Siege_Unit :

select https://0ad.fandom.com/wiki/Siege_Unit 's :

rams, not heros, Catapult, Bolt Shooter, Siege Tower

hotkey.autociv.session.entity.by.class.select.Siege = "Alt+V"

suggestion?

### selects diplomacy with Ctrl+< (think about: give out, move resources to your partners):

hotkey.session.gui.diplomacy.toggle = "Ctrl+SYM_100"


### Howto find the names? i use create map scenario editor

BTW cant find WarElephant into the scenario editor

and taka a long in your user.cfg

### some comments about the cnanges:
little simplification:

hotkey.autociv.session.entity.by.class.select.(Infantry&Archer|Infantry&Slinger|Infantry&Javelineer|Elephant&Archer) = "Alt+A"
hotkey.autociv.session.entity.by.class.select.(Infantry&Soldier)&!Slinger&!Slinger&!Javelineer&!Archer&!Spearman = "Alt+S"
hotkey.autociv.session.entity.by.class.select.(Infantry&Pikeman|Infantry&Spearman|Champion&Fanatic) = "Alt+P"

=>

hotkey.autociv.session.entity.by.class.select.(Archer|Slinger|Javelineer|Archer) = "Alt+A"
hotkey.autociv.session.entity.by.class.select.(Soldier)&!Slinger&!Javelineer&!Archer&!Spearman = "Alt+S"
hotkey.autociv.session.entity.by.class.select.(Pikeman|Spearman|Fanatic) = "Alt+P"


## Tips for start the game:

start 0ad in a infinite loop. So you never need to resart it manually when you change use TogglCommunityMod - Command or simply when changing the mode via mod-profiler. It allows for fast restart.
For exit you then need to exit the calling app (typically a terminal).

### Example when you use fish-shell:

####  That's a fish-style endless loop; very useful with TogglComunityMod - Command or simly when changing the mode via mod-profiler. It allows for fast restart :

```fish
alias 6game026start 'while true; cd ~/game/0ad/026/; ./0ad-0.0.26-alpha-2210110407-x86_64_0cdfe6000a403313b99d6ea006a92d81.AppImage; sleep 1; end; '
```

The command sets up an alias in the fish-shell. An alias is a way to create a shorthand or shortcut for a longer command.

- alias: This is the command to define an alias.
- 6game026: This is the name of the alias. It is the shorthand you want to use to refer to the longer command.
- 'while true; ... end; ':
- The longer command inside the single quotes is a loop that runs indefinitely (while true) and performs the following actions:

1. `cd ~/game/0ad/026/` : Change the current directory to `~/game/0ad/026/` . The `~/` notation represents the user's home directory.
2. `./0ad-0.0.26-alpha-2210110407-x86_64_0cdfe6000a403313b99d6ea006a92d81.AppImage` : Execute the 0ad AppImage

The purpose of this alias is to provide a shortcut command (6game026) that allows for easy and infinite execution of the game. To stop the game, you will need to terminate the terminal session.

useful with TogglComunityMod - Command or simly when changing the mode via mod-profiler.
### Bash-Style enless loops ( not tested ):

```sh
alias 6game026='while true; do 0ad; sleep 1; done'
```

### for windows users ( not tested !!! ):

```batch
@echo off
:loop
cd /d C:\path\to\game\0ad\026
start "" 0ad
timeout /t 1 >nul
goto loop
```

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

- Helping modders:
  - @nani - [Autociv](https://github.com/nanihadesuka/autociv)
  - @andy5995 - https://github.com/andy5995/
  - @Mentula - https://gitlab.com/mentula0ad
  - @Atric - https://gitlab.com/4trik
  - @LangLangBart - https://github.com/LangLangBart
  - @leite - [autocivP](https://github.com/leite/autocivP) - [pull/21](https://github.com/sl5net/autocivP/pull/21)


- Thanks to all other modders
