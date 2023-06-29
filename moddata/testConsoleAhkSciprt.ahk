# tips:
# find window geometry by using linux commmand:
# xdotool getactivewindow getwindowgeometry

keyboard.release_key('<shift>')

from pathlib import Path

import subprocess
import time

# autokey-run -s 0ad_TTS_lastPlayers

# 22-1104_1946-56 N.: ensure that you're in alpha26 with pidgin before connecting 0ad
if False: # start pidgin
    p2 = subprocess.Popen("pidgin", shell=True)

if False: # start screenkey
    p2 = subprocess.Popen("screenkey", shell=True) # something usefull for teaching


# if True: # open config file
if False: # open config file
    home = str(Path.home())
    from subprocess import Popen
    c1 = home + "/game/0ad/026/.config/0ad/config/user.cfg"
    c2 = home + "/.config/0ad/config/user.cfg"
    p = Popen(['kate', c1]) # something long running
    p = Popen(['kate', c2]) # something long running


if False: # start 0ad from git
    home = str(Path.home())
    c = home + "/git/0a26/binaries/system/pyrogenesis"

    # dont wait till the proccess is edndet . 
    from subprocess import Popen

    p = Popen([c, '']) # something long running
    # p = Popen([c, '--user=[user]']) # something long running and bit more explicit
    # p = Popen([c, '-writableRoot']) # not good idea to run 0ad as root. 

    # ... do other stuff while subprocess is running
    # p.terminate()

    time.sleep(.3)  # .2 works is maybe sometimes to fast
    c = "pyrogenesis.pyrogenesis"
    window.activate(c, False, True)
    window.resize_move(c, xOrigin=1908, yOrigin=-287, width=1925, height=1089, matchClass=True)

if False: # ask before kill and start
    choices = [
      "restart",
      "NOT restart 0ad"
    ]
    # retCode, choice = dialog.list_menu(choices)
    retCode, choice = dialog.list_menu(choices, title="Choose game", message="good luck ;)", default=None,  geometry="800x700" )
    if retCode == 0:
        if choice == "restart":
            time.sleep(.01)
        else:
            exit(1)
# killall

# p3 = subprocess.Popen(['killall' ,'main'])
# time.sleep(.9)


def sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens):
    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)

    if not window.wait_for_focus('0 A.D.',1):  # pyrogenesis.pyrogenesis',1):
        clipboard.fill_clipboard('exit 23-0627_1836-30')
        exit(1)

    keyboard.send_keys('<enter>')  
    time.sleep(0.1)


# if True: # re start 0ad
if False: # re start 0ad
    p3 = subprocess.Popen(['killall' ,'main'])
    time.sleep(.9)

    # dont wait till the proccess is edndet . 
    from subprocess import Popen
    
    #c = "0ad"
    
    c = 'cd ~/game/0ad/026; HOME="$HOME/game/0ad/026" ./0ad-0.0.26-alpha-2210110407-x86_64_0cdfe6000a403313b99d6ea006a92d81.AppImage'
    c = 'cd ~/game/0ad/026/; ./0ad-0.0.26-alpha-2210110407-x86_64_0cdfe6000a403313b99d6ea006a92d81.AppImage'

    
    p2 = subprocess.Popen(c, shell=True)
    time.sleep(0.9)  # 1 was to fast
    
    # c = "pyrogenesis.pyrogenesis"
    # if not window.wait_for_exist(c,1):  # pyrogenesis.pyrogenesis',1): 
    #    exit(1)
    
    # if not window.wait_for_focus("arena26", 1):  # wait_for_focus(self, title, timeOut=5)
    #    exit(1)
 
if True:  # move 0ad
    c = '0 A.D.'
    window.activate(c, True, True)
    if not window.wait_for_focus(c, 2):  
        clipboard.fill_clipboard('exit 23-0627_1835-57')
        exit(1) # exit 23-0627_1835-55 exit 23-0627_1835-55 exit 23-0627_1835-56
        
    c = "pyrogenesis.pyrogenesis" # foncus dont work hiere with classname but move :) 
    # window.resize_move(c, xOrigin=1908, yOrigin=-27, width=1925, height=1089, matchClass=True)
    window.resize_move(c, xOrigin=-27, yOrigin=-28, width=1925, height=1089, matchClass=True)
    time.sleep(0.4)  # 1 was to fast

if False:  # local host a game
    # subprocess.call(["xdotool", "mousemove", "500", "500"])
    
    
    # https://autokey.github.io/api/mouse.html
    # mouse.move_cursor(400,400)
    
    mouse.move_cursor(172, 261)
    time.sleep(0.1)
    mouse.click_relative(4, 2, 1)
    if False:
        time.sleep(0.4)
        mouse.click_relative(-4, 10, 1)
    time.sleep(0.4)
    mouse.click_absolute(172, 261, 1)  # multiplayer
    time.sleep(0.1)
    mouse.click_relative(1, 1, 1)
    time.sleep(0.1)
    mouse.click_relative(-2, 1, 1)
    time.sleep(0.2)
    # mouse.click_absolute(172, 261, 1)  # multiplayer
    time.sleep(0.4)
    mouse.click_absolute(395, 299, 1)  # host a game
    time.sleep(0.1)
    mouse.click_relative(2, 2, 1)
    time.sleep(0.1)
    # mouse.click_absolute(395, 299, 1)  # host a game
    time.sleep(0.3)
    # keyboard.send_keys('<enter>')  #
    # time.sleep(0.1)
    keyboard.send_keys('<enter>')  #
    time.sleep(0.4)

    exit(1)

sleepSlowThatHumansCouldSeeWhatHappens = 1.5
sleepSlowThatHumansCouldSeeWhatHappens = 0.1

if True:   # try crash 0ad. use tab command often     in game config
    c = "pyrogenesis.pyrogenesis" # focus seems not work with classname
    c = '0 A.D.'
    window.activate(c, False, True)
    window.wait_for_focus(c,2)
    if not window.wait_for_focus(c, 1):  
        clipboard.fill_clipboard('23-0627_1904-35')
        exit(1)
    keyboard.press_key('<shift>')
    # keyboard.send_keys("/ga<tab 5>")
    keyboard.send_keys("<shift>+<home>GA<tab><tab><tab><tab><tab><tab><tab><tab><tab>")  # work
    keyboard.release_key('<shift>')
     # keyboard.send_keys("<shift>+<home>GA<tab><tab><tab><tab><tab><tab><tab><tab><tab>")  # work

if True:  # try crash 0ad. use tab command often     in game config
    # Shfit+Home+Ga
    # keyboard.send_keys("<shift>+<home>")
    versionCodeNr = 4 ########################################
    keyboard.send_keys( str(versionCodeNr) +  " Ga")
    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    for i in range(1):
        if not window.wait_for_focus('0 A.D.', 1):  # pyrogenesis.pyrogenesis',1):
            keyboard.release_key('<shift>')
            clipboard.fill_clipboard('23-0627_1904-35')
            exit(1)
        keyboard.send_keys('<tab>' + str(i))
        time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)

    # keyboard.send_keys("Ga")
    keyboard.send_keys("Ga") # 23-0627_1951-58 i added this and then it crashed.
    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.press_key('<shift>')
    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    for i in range(10):
        if not window.wait_for_focus('0 A.D.', 1):  # pyrogenesis.pyrogenesis',1):
            keyboard.release_key('<shift>')
            clipboard.fill_clipboard('23-0627_1905-04')
            exit(1)
        keyboard.send_keys("/ga<tab><tab><tab><tab>") # 

        keyboard.press_key('<home>')
        keyboard.send_keys("/ga<tab @><tab #><tab Ü><tab ä>")
        keyboard.release_key('<home>')
        
        time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
        keyboard.send_keys("/<enter>")

        time.sleep(0.1) # 
        if not window.wait_for_focus('0 A.D.', 1):  # pyrogenesis.pyrogenesis',1):
            keyboard.release_key('<shift>')
            clipboard.fill_clipboard('23-0627_1956-27')
            exit(1)
        
        keyboard.send_keys("<shift>+<home>GA<tab><tab><tab><tab><tab><tab><tab><tab><tab>")  # work
        time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)

        time.sleep(0.1)
        if not window.wait_for_focus('0 A.D.', 1):  # pyrogenesis.pyrogenesis',1):
            keyboard.release_key('<shift>')
            clipboard.fill_clipboard('23-0627_1956-48')            
            exit(1)

        keyboard.send_keys("/<enter>")  # work
        time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.release_key('<shift>')
    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    
    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    keyboard.send_keys("versionCodeNr = " + str( versionCodeNr) )  # home = pos1

    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    # sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)





###
# The autociv mod should handle the special characters gracefully without crashing the game.
if window.wait_for_focus('0 A.D.', 1):  # Wait for the game window to have focus
    keyboard.send_keys('<shift>+<home>')  # Select any existing text in the chat console
    keyboard.send_keys('<delete>')  # Clear the chat console
    special_characters = "!@#$%^&*()_+-=[]{}|;':,.<>?`~"
    command = "/special_command " + special_characters
    keyboard.send_keys(command)  # Enter the command with special characters
    keyboard.send_keys('<enter>')  # Submit the command

time.sleep(1)  # Add a delay to allow time for processing

# Verify expected behavior
expected_output = "/p" + special_characters  # The expected command with special characters
#actual_output = get_chat_console_output()  # Function to retrieve the chat console output
actual_output = ''  # Function to retrieve the chat console output

if expected_output in actual_output:
    print("Test Passed: Special characters were handled correctly.")
else:
    print("Test Failed: Special characters were not handled correctly.")

def run_test(method, special_characters):
    # Open the chat console
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")
    keyboard.send_keys("<Enter>")

    # Wait for the chat console to appear
    time.sleep(1)

    # List of special characters to test
    # special_characters = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']',
#                          '{', '}', '|', ':', ';', ',', '.', '<', '>', '/', '?', '~']

    for char in special_characters:
        # Enter the special character in the chat console
        keyboard.send_keys(char)

        # Wait for a brief moment to observe the behavior
        time.sleep(0.09) # 

        # Verify that the game is still running without crashing
        if not window.wait_for_focus('0 A.D.', 1):
            # Game crashed, record the failure and exit the test
            clipboard.fill_clipboard(datetime.now().strftime("%Y-%m-%d_%H:%M:%S"))
            exit(1)

        # Clear the chat console
        if method == 'tab':
            keyboard.send_keys("<tab>")
        else:
            keyboard.send_keys("<ctrl>+a")
            keyboard.send_keys("<delete>")
        
        # Wait for a brief moment before testing the next special character
        time.sleep(0.09)

# Run the test

special_characters = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']',
                          '{', '}', '|', ':', ';', ',', '.', '<', '>', '/', '?', '~']

run_test('tab', special_characters)
run_test('enter', special_characters)

run_test('tab', special_characters)
run_test('enter', special_characters)

run_test('tab', special_characters)
run_test('enter', special_characters)

run_test('tab', special_characters)
run_test('enter', special_characters)

run_test('tab', special_characters)
run_test('enter', special_characters)

run_test('tab', special_characters)
run_test('enter', special_characters)





exit(1)

# 

if False:  # gl wp u2 re     in game config
    # keyboard.send_keys('/gg')  # works
    # sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('gg<tab>')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    # keyboard.send_keys('wp<tab>')
    # keyboard.send_keys('u2<tab>')
    # sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    # sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    # keyboard.send_keys('re<tab>')
    # sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

if False:  # set command rated     in game config
    keyboard.send_keys('/ratedDefault on')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    keyboard.send_keys('/ratedDefault 1')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    keyboard.send_keys('/ratedDefault')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    keyboard.send_keys('/ratedDefault true')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    keyboard.send_keys('/ratedDefault')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('/popMaxDefault 300')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('/popMaxDefault 200')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('/popMaxDefault 250')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

if False:  # hiAll
    sleepSlowThatHumansCouldSeeWhatHappens = 2

    # keyboard.send_keys('/hiAll hi1')
    # sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    #
    # time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    #
    # keyboard.send_keys('/hiAll')
    # sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    #
    # time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('/hiAll hi2')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('hiall<tab>')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('/hiall')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

if False:  # set profiles     in the game config command line
    sleepSlowThatHumansCouldSeeWhatHappens = 1.5

    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('/p2<tab>')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    
    # time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    #
    # keyboard.send_keys('/p2<tab>')
    # sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    #
    # time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    #
    # keyboard.send_keys('/p3<tab>')
    # sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    #
    # time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    #
    # keyboard.send_keys('/p4<tab>')
    # sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)
    #
    # time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    #
    #
    # time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    
    keyboard.send_keys('/p1<tab>') 
    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    keyboard.send_keys('<enter>')

    keyboard.send_keys('/pRestoreLastProfile<tab>')
    time.sleep(sleepSlowThatHumansCouldSeeWhatHappens)
    keyboard.send_keys('<enter>')



if False:  # help commands

    keyboard.send_keys('/help /pm')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('/help /p\d')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('/help rat')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('/help help')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('wp<tab>')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('j<tab>')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

    keyboard.send_keys('li<tab>')
    sleepThenEnter(sleepSlowThatHumansCouldSeeWhatHappens)

# keyboard.send_keys('End of all commands :) good bye')
exit(1)

















# time.sleep(2)
if False: # start 0ad_TTS_userCfg
    p2 = subprocess.Popen("autokey-run -s 0ad_TTS_userCfg", shell=True)


if False:
    from plyer import notification
    notification.notify(
        title = "started ? :)",
        message = "hi from 0ad_start",
        timeout= 2,
        toast=False)



#### #jetbrains-pycharm-ce.jetbrains-pycharm-ce

if False:
    # join lobby
    mouse.click_absolute(2200,825,1)
    # keyboard.send_keys('/<alt>+l')  # 
    time.sleep(2.5)
    # mouse.click_absolute(2977,700,1)
    mouse.click_absolute(2977,700,1)
    time.sleep(1.6) # 22-0905_1618-23 1.6 sometimes to short # 22-0905_1414-32 1.5 was a bit short maybe
    keyboard.send_keys('/away<enter>')  # 




exit(1)

# single game start
x = 2080 - 1920
y = 230
mouse.click_relative(x + 2,y,1)
#mouse.click_relative(x + 4,1050,1)
mouse.click_relative(x + 6,y + 2,1)
mouse.click_relative(x + 8,y + 2,1)

time.sleep(.5)
x = 2320 - 1920
mouse.click_relative(x + 2,y,1)
#mouse.click_relative(x + 4,1050,1)
mouse.click_relative(x + 6,y + 2,1)
mouse.click_relative(x + 8,y + 2,1)

time.sleep(.5)
x = 3740 - 1920
y = 1065 # 1080 is screen height
mouse.click_relative(x + 2,y,1)
#mouse.click_relative(x + 4,1050,1)
mouse.click_relative(x + 6,y + 2,1)
mouse.click_relative(x + 8,y + 2,1)

