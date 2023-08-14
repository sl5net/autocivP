#!/bin/bash

# how to start maybe when using fish-shell :
# alias cdCreateAutoCivPmodIOZip "cd ~/.local/share/0ad/mods/autocivp; pwd; ./modBuildScript.sh"

# links:
# https://wildfiregames.com/forum/topic/24333-guide-for-publishing-mods-on-modio/?do=findComment&comment=554945
# https://wildfiregames.com/forum/topic/24333-guide-for-publishing-mods-on-modio/#comment-554994
# may some interesting stuff also here: https://github.com/ModIO/

# alternative may you want create mods also by using this script that use pyrogenesis:
# rm ~/Downloads/autocivP.pyromod
# rm ~/game/0ad/a27/a27build/binaries/system/autocivP.pyromod
# cd ~/game/0ad/a27/a27build/binaries/system/
# ./pyrogenesis -mod=mod -mod=public -mod=autocivP -archivebuild=/home/seeh/.local/share/0ad/mods/autocivP -archivebuild-output=autocivP.pyromod -archivebuild-compress
# cp ~/game/0ad/a27/a27build/binaries/system/autocivP.pyromod ~/Downloads/autocivP.pyromod
# rm ~/game/0ad/a27/a27build/binaries/system/autocivP.pyromod
# cp ~/Downloads/autocivP.pyromod ~/Downloads/autocivP.zip
# doublecmd ~/game/0ad/a27/a27build/binaries/system/ ~/Downloads/


# This SH-script performs the following actions:
#
# Extracts the value of the mod_name variable from the mod.json file using the jq command-line tool.
# Removes the existing ${mod_name}_temp directory and creates a new one.
# Copies directories directly within the copy_dir_from directory to the ${mod_name}_temp directory.
# Copies non-hidden files from the copy_dir_from directory to the mod_temp directory, excluding specific files.
# Creates a zip file (${mod_name}_temp.zip) for the mod by compressing the contents of the ${mod_name}_temp directory.
# Creates a second temp directory (autocivP_temp2) and copies the mod.json file and the ${mod_name}_temp.zip file into it.
# Creates a zip file (${mod_name}.zip) for the mod by compressing the contents of the ${mod_name}_temp2 directory.
# Opens a web browser (Firefox) with a specific URL related to the mod.
# Note: The script assumes that the jq command-line tool is installed and its run inside your mod folder

clear

# Extract the value of the mod_name variable from mod.json
mod_name=$(jq -r '.name' mod.json)

echo "${mod_name}"
# clear

dir_mod="$PWD"
dir_mods="$PWD/.."
dir_temp="${dir_mods}/${mod_name}_temp"
echo "41: dir_temp= $dir_temp"
dir_temp2="${dir_mods}/${mod_name}_temp2"

# Clean the file path
dir_mod=$(realpath "$(readlink -f "$dir_mod")")
dir_mods=$(realpath "$(readlink -f "$dir_mods")")
echo "47: dir_temp= $dir_temp"
dir_temp=$(realpath "$(readlink -f "$dir_temp")")
dir_temp2=$(realpath "$(readlink -f "$dir_temp2")")

echo "PWD= $PWD"
echo "dir_mod= $dir_mod"
echo "dir_mods= $dir_mods"
echo "53: dir_temp= $dir_temp"
echo "53: dir_temp2= $dir_temp2"

#!/bin/bash

# use this from inside your mod

# Remove existing autocivP_temp directory and create a new one
rm -rf $dir_temp
mkdir $dir_temp

copy_dir_from="${dir_mod}" # Use absolute path of the source directory
echo "copy_dir_from= $copy_dir_from"


# Copy directories directly within $copy_dir_from
find $copy_dir_from/* -maxdepth 0 -type d -exec cp -r {} $dir_temp \;


# Copy non-hidden files, excluding tempList.text and tsconfig.json
find $copy_dir_from -maxdepth 1 -type f -not -name ".*" -not -name "tempList.text" -not -name "tsconfig.json"  -not -name "error_unsolved.txt" -exec cp {} $dir_temp \;

# Display the directories within autocivP_temp
# find $dir_temp -type d

echo ${dir_mod}
echo ${dir_mods}


# Display the current working directory
pwd

# List the files and directories within autocivP_temp
# ls -l $dir_temp

# delete somme files from $dir_temp
rm $dir_temp/modBuildScript.*

# Count the number of files and folders in autocivP_temp (excluding the autocivP_temp directory itself)
num_files=$(find $dir_temp -type f | wc -l)
num_folders=$(find $dir_temp -type d | wc -l)
num_folders=$((num_folders - 1))
echo "Number of files in ${dir_temp}: $num_files"
echo "Number of folders in ${dir_temp}: $num_folders"

# Create a zip file for mod
# rm -rf ${dir_mods}/${mod_name}_temp.zip
rm -rf ${dir_mods}/${mod_name}.zip
rm -rf ${dir_mods}/${mod_name}_doubleZipedLikeMostModsWhenInUse.zip

cd ${dir_temp}
echo "zip -r ${dir_mods}/${mod_name}_temp.zip ."
zip -r ${dir_mods}/${mod_name}_temp.zip .  # _readyForUploadToModIo.zip



# _readyForUploadToModIo

# Create a second temp directory
rm -rf $dir_temp2
mkdir $dir_temp2

# Copy the mod.io file to the second temp directory
cp ${dir_mod}/mod.json $dir_temp2

# Copy the ${mod_name}_temp.zip
cp ${dir_mods}/${mod_name}_temp.zip $dir_temp2/${mod_name}.zip
cp ${dir_mods}/${mod_name}_temp.zip ${dir_mods}/${mod_name}.zip

sleep 1
cd ${pwd}
sleep 1
cd $dir_temp2
sleep 1
zip -r ${dir_mods}/${mod_name}_doubleZipedLikeMostModsWhenInUse.zip .  # but not useful for upload in mod.io

# Sleep for 1 second before continuing
sleep 1

firefox https://mod.io/g/0ad/m/${mod_name}
