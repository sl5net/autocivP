
 this dont work at the moment
 this dont work at the moment
 this dont work at the moment
 this dont work at the moment
 use the sh-version





package main

import (
    "archive/zip"
    "fmt"
    "io"
    "os"
    "path/filepath"
)

func main() {
    // Extract the value of the mod_name variable from the mod.json file
    modName, err := extractModName("mod.json")
    if err != nil {
        fmt.Println("Failed to extract mod name:", err)
        return
    }

    fmt.Println("modName:", modName)


    // Remove existing ${mod_name}_temp directory and create a new one
    tempDir := "../" + modName + "_temp"
    err = os.RemoveAll(tempDir)
    if err != nil {
        fmt.Println("Failed to remove existing temp directory:", err)
        return
    }
    err = os.Mkdir(tempDir, 0755)
    if err != nil {
        fmt.Println("Failed to create temp directory:", err)
        return
    }

    // Copy directories directly within the copy_dir_from directory to the ${mod_name}_temp directory
    copyDirFrom := "/home/seeh/.local/share/0ad/mods/autocivp"
    err = copyDirectories(copyDirFrom, tempDir)
    if err != nil {
        fmt.Println("Failed to copy directories:", err)
        return
    }

    // Copy non-hidden files from the copy_dir_from directory to the mod_temp directory, excluding specific files
    err = copyFiles(copyDirFrom, tempDir, []string{"exclude_file1.txt", "exclude_file2.txt"})
    if err != nil {
        fmt.Println("Failed to copy files:", err)
        return
    }

    // Create a zip file (${mod_name}_temp.zip) for the mod by compressing the contents of the ${mod_name}_temp directory
    tempZipFile := tempDir + ".zip"
    err = createZip(tempDir, tempZipFile)
    if err != nil {
        fmt.Println("Failed to create temp zip file:", err)
        return
    }

    // Create a second temp directory (autocivP_temp2) and copy the mod.json file and the ${mod_name}_temp.zip file into it
    tempDir2 := "autocivP_temp2"
    err = os.RemoveAll(tempDir2)
    if err != nil {
        fmt.Println("Failed to remove existing temp2 directory:", err)
        return
    }
    err = os.Mkdir(tempDir2, 0755)
    if err != nil {
        fmt.Println("Failed to create temp2 directory:", err)
        return
    }
    err = copyFile("mod.json", filepath.Join(tempDir2, "mod.json"))
    if err != nil {
        fmt.Println("Failed to copy mod.json:", err)
        return
    }
    err = copyFile(tempZipFile, filepath.Join(tempDir2, tempZipFile))
    if err != nil {
        fmt.Println("Failed to copy temp zip file:", err)
        return
    }

    // Create a zip file (${mod_name}.zip) for the mod by compressing the contents of the ${mod_name}_temp2 directory
    finalZipFile := modName + ".zip"
    err = createZip(tempDir2, finalZipFile)
    if err != nil {
        fmt.Println("Failed to create final zip file:", err)
        return
    }

    /* Open a web browser (Firefox) with a specific URL related to the mod
    err = openBrowser("https://example.com/" + modName)
    if err != nil {
        fmt.Println("Failed to open web browser:", err)
        return
    }
    */

    fmt.Println("Script completed successfully!")
}

func extractModName(jsonFile string) (string, error) {
    // Implement the logic to extract the mod name from the JSON file using your preferred method/library
    return "autocivp", nil
}

func copyDirectories(srcDir, destDir string) error {
    // Open the source directory
    src, err := os.Open(srcDir)
    if err != nil {
        return fmt.Errorf("failed to open source directory: %w", err)
    }
    defer src.Close()

    // Create the destination directory
    err = os.MkdirAll(destDir, os.ModePerm)
    if err != nil {
        return fmt.Errorf("failed to create destination directory: %w", err)
    }

    // Get the list of directory entries in the source directory
    entries, err := src.Readdir(-1)
    if err != nil {
        return fmt.Errorf("failed to read source directory: %w", err)
    }

    // Iterate over the directory entries
    for _, entry := range entries {
        // Check if the entry is a directory
        if entry.IsDir() {
            // Create the corresponding directory in the destination directory
            err := os.MkdirAll(filepath.Join(destDir, entry.Name()), os.ModePerm)
            if err != nil {
                return fmt.Errorf("failed to create directory in destination: %w", err)
            }

            // Recursively copy the subdirectories
            err = copyDirectories(filepath.Join(srcDir, entry.Name()), filepath.Join(destDir, entry.Name()))
            if err != nil {
                return fmt.Errorf("failed to copy subdirectory: %w", err)
            }
        }
    }

    return nil
}
func copyFiles(copyDirFrom, copyDirTo string, excludeFiles []string) error {
    // Open the source directory
    src, err := os.Open(copyDirFrom)
    if err != nil {
        return fmt.Errorf("failed to open source directory: %w", err)
    }
    defer src.Close()

    // Create the destination directory
    err = os.MkdirAll(copyDirTo, os.ModePerm)
    if err != nil {
        return fmt.Errorf("failed to create destination directory: %w", err)
    }

    // Get the list of directory entries in the source directory
    entries, err := src.Readdir(-1)
    if err != nil {
        return fmt.Errorf("failed to read source directory: %w", err)
    }

    // Iterate over the directory entries
    for _, entry := range entries {
        // Check if the entry is a file
        if entry.Mode().IsRegular() {
            // Check if the file should be excluded
            exclude := false
            for _, excludeFile := range excludeFiles {
                if entry.Name() == excludeFile {
                    exclude = true
                    break
                }
            }

            if !exclude {
                // Open the source file
                srcFile, err := os.Open(filepath.Join(copyDirFrom, entry.Name()))
                if err != nil {
                    return fmt.Errorf("failed to open source file: %w", err)
                }
                defer srcFile.Close()

                // Create the destination file
                dstFile, err := os.Create(filepath.Join(copyDirTo, entry.Name()))
                if err != nil {
                    return fmt.Errorf("failed to create destination file: %w", err)
                }
                defer dstFile.Close()

                // Copy the contents from source to destination
                _, err = io.Copy(dstFile, srcFile)
                if err != nil {
                    return fmt.Errorf("failed to copy file contents: %w", err)
                }
            }
        }
    }

    return nil
}
func createZip(sourceDir, destinationFile string) error {
    // Create a new zip file
    zipFile, err := os.Create(destinationFile)
    if err != nil {
        return fmt.Errorf("failed to create zip file: %w", err)
    }
    defer zipFile.Close()

    // Create a new zip writer
    zipWriter := zip.NewWriter(zipFile)
    defer zipWriter.Close()

    // Walk through the source directory and add files to the zip
    err = filepath.Walk(sourceDir, func(filePath string, info os.FileInfo, err error) error {
        if err != nil {
            return err
        }

        // Skip directories
        if info.IsDir() {
            return nil
        }

        // Open the source file
        file, err := os.Open(filePath)
        if err != nil {
            return fmt.Errorf("failed to open source file: %w", err)
        }
        defer file.Close()

        // Create a new file in the zip archive
        zipEntry, err := zipWriter.Create(filePath)
        if err != nil {
            return fmt.Errorf("failed to create zip entry: %w", err)
        }

        // Copy the contents from source file to the zip entry
        _, err = io.Copy(zipEntry, file)
        if err != nil {
            return fmt.Errorf("failed to copy file contents to zip: %w", err)
        }

        return nil
    })

    if err != nil {
        return fmt.Errorf("failed to walk through source directory: %w", err)
    }

    return nil
}


func copyFile(sourcePath, destinationPath string) error {
    // Open the source file
    sourceFile, err := os.Open(sourcePath)
    if err != nil {
        return fmt.Errorf("failed to open source file: %w", err)
    }
    defer sourceFile.Close()

    // Create the destination file
    destinationFile, err := os.Create(destinationPath)
    if err != nil {
        return fmt.Errorf("failed to create destination file: %w", err)
    }
    defer destinationFile.Close()

    // Copy the contents from source to destination
    _, err = io.Copy(destinationFile, sourceFile)
    if err != nil {
        return fmt.Errorf("failed to copy file contents: %w", err)
    }

    return nil
}

func openBrowser(url string) error {

    /*
     *     var err error

     * switch runtime.GOOS {
    case "darwin":
        err = exec.Command("open", url).Start()
    case "windows":
        err = exec.Command("cmd", "/c", "start", url).Start()
    default:
        err = exec.Command("xdg-open", url).Start()
    }

    if err != nil {
        return fmt.Errorf("failed to open browser: %w", err)
    }
    */
    return nil
}
