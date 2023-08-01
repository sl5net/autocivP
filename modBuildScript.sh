#!/bin/bash

# This script performs the following actions:
# 
# Extracts the value of the mod_name variable from the mod.json file using the jq command-line tool.
# Removes the existing ${mod_name}_temp directory and creates a new one.
# Copies directories directly within the copy_dir_from directory to the ${mod_name}_temp directory.
# Copies non-hidden files from the copy_dir_from directory to the mod_temp directory, excluding specific files.
# Creates a zip file (${mod_name}_temp.zip) for the mod by compressing the contents of the ${mod_name}_temp directory.
# Creates a second temp directory (autocivP_temp2) and copies the mod.json file and the ${mod_name}_temp.zip file into it.
# Creates a zip file (${mod_name}.zip) for the mod by compressing the contents of the ${mod_name}_temp2 directory.
# Opens a web browser (Firefox) with a specific URL related to the mod.
# Note: The script assumes that the jq command-line tool is installed, and it is recommended to use absolute paths when specifying directories to avoid any potential issues.

# use this from inside your mod folder

clear

# Extract the value of the mod_name variable from mod.json
mod_name=$(jq -r '.name' mod.json)

dir_mod="$PWD"
dir_mods="$PWD/.."
dir_temp="${dir_mods}/${mod_name}_temp"
dir_temp2="${dir_mods}/${mod_name}_temp2"

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

# Count the number of files and folders in autocivP_temp (excluding the autocivP_temp directory itself)
num_files=$(find $dir_temp -type f | wc -l)
num_folders=$(find $dir_temp -type d | wc -l)
num_folders=$((num_folders - 1))
echo "Number of files in ${dir_temp}: $num_files"
echo "Number of folders in ${dir_temp}: $num_folders"

# Create a zip file for mod
rm -rf ${dir_mods}/${mod_name}_temp.zip
rm -rf ${dir_mods}/${mod_name}.zip

cd ${dir_temp}
echo "zip -r ${dir_mods}/${mod_name}_temp.zip ."
zip -r ${dir_mods}/${mod_name}_temp.zip .


# Create a second temp directory
rm -rf $dir_temp2
mkdir $dir_temp2

# Copy the mod.io file to the second temp directory
cp ${dir_mod}/mod.json $dir_temp2

# Copy the ${mod_name}_temp.zip to the second temp directory
cp ${dir_mods}/${mod_name}_temp.zip $dir_temp2/${mod_name}.zip

# Zip the autocivP_temp_2 directory
# echo dir_temp2=/absolute/path/to/${mod_name}/$dir_temp2

clear
sleep 1
cd ${pwd}
sleep 1
cd $dir_temp2
sleep 1
zip -r ${dir_mods}/${mod_name}.zip .

# Sleep for 1 second before continuing
sleep 1

firefox https://mod.io/g/0ad/m/${mod_name}
