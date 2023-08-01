
this is a draft ... not work for the moment better use the sh-script.

// Import required modules
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Promisify execSync function
const execAsync = promisify(execSync);

// Function to copy files and create zip archives
async function copyFiles() {
  // Specify the name for your script
  const scriptName = 'script.js';

  // Set the name of your mod
  const modName = 'autocivP';

  // Get the current working directory
  const dirMod = process.cwd();

  // Set the directory where the mods are stored
  const dirMods = path.join(process.cwd(), '..');

  // Set the temporary directories
  const dirTemp = path.join(dirMods, 'autocivP_temp');
  const dirTemp2 = path.join(dirMods, 'autocivP_temp2');

  // Remove existing autocivP_temp directory and create a new one
  await fs.promises.rm(dirTemp, { recursive: true, force: true });
  await fs.promises.mkdir(dirTemp);

  // Specify the source directory to be copied
  const copyDirFrom = dirMod;
  console.log(`copy_dir_from= ${copyDirFrom}`);

  // Copy directories directly within copyDirFrom
  const directories = await fs.promises.readdir(copyDirFrom, { withFileTypes: true });
  const directoriesToCopy = directories.filter((dirent) => dirent.isDirectory());
  for (const dirent of directoriesToCopy) {
    await execAsync(`cp -r ${path.join(copyDirFrom, dirent.name)} ${dirTemp}`, { stdio: 'inherit' });
  }

  // Copy non-hidden files, excluding tempList.text and tsconfig.json
  const files = await fs.promises.readdir(copyDirFrom);
  const filesToCopy = files.filter(
    (file) =>
      !file.startsWith('.') &&
      file !== 'tempList.text' &&
      file !== 'tsconfig.json' &&
      file !== 'error_unsolved.txt'
  );
  for (const file of filesToCopy) {
    await execAsync(`cp ${path.join(copyDirFrom, file)} ${dirTemp}`, { stdio: 'inherit' });
  }

  // Create a zip file for mod
  await fs.promises.rm(path.join(dirMods, `${modName}_temp.zip`), { recursive: true, force: true });
  await fs.promises.rm(path.join(dirMods, `${modName}.zip`), { recursive: true, force: true });

  process.chdir(dirTemp);
  await execAsync(`zip -r ${path.join(dirMods, `${modName}_temp.zip`)} .`, { stdio: 'inherit' });

  // Create a second temp directory
  await fs.promises.rm(dirTemp2, { recursive: true, force: true });
  await fs.promises.mkdir(dirTemp2);

  // Copy the mod.io file to the second temp directory
  await fs.promises.copyFile(path.join(dirMod, 'mod.json'), path.join(dirTemp2, 'mod.json'));

  // Copy the ${modName}_temp.zip to the second temp directory
  await fs.promises.copyFile(
    path.join(dirMods, `${modName}_temp.zip`),
    path.join(dirTemp2, `${modName}.zip`)
  );
}

// Call the copyFiles function
copyFiles().catch((error) => {
  console.error(error);
});
