<# 
.SYNOPSIS
    Crush Launcher - Opens folder selection dialog and launches crush.exe in selected directory

.DESCRIPTION
    This script presents a Windows folder selection dialog, changes to the selected directory,
    and launches crush.exe from the crush-study build directory.

.NOTES
    Author: Crush Launcher
    Requires: PowerShell 5.1+ (Windows built-in)
#>

# Set execution policy for current session if needed
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Path to crush.exe
$CrushExePath = "C:\opt\l-llm\crush-study\crush.exe"

# Verify crush.exe exists
if (-not (Test-Path $CrushExePath)) {
    Write-Error "crush.exe not found at: $CrushExePath"
    Write-Host "Please build crush first: go build -o crush.exe ."
    Read-Host "Press Enter to exit"
    exit 1
}

# Load Windows Forms assembly for folder browser dialog
Add-Type -AssemblyName System.Windows.Forms

# Create folder browser dialog
$folderDialog = New-Object System.Windows.Forms.FolderBrowserDialog
$folderDialog.Description = "Select a folder to launch Crush in"
$folderDialog.ShowNewFolderButton = $true

# Set initial directory to user's home or current directory
$folderDialog.SelectedPath = "C:\opt\l-llm"

# Show dialog
$result = $folderDialog.ShowDialog()

if ($result -eq [System.Windows.Forms.DialogResult]::OK -and $folderDialog.SelectedPath) {
    $selectedPath = $folderDialog.SelectedPath
    Write-Host "Selected folder: $selectedPath"
    
    # Change to selected directory and launch crush.exe
    try {
        Set-Location -Path $selectedPath -ErrorAction Stop
        Write-Host "Launching crush.exe from: $selectedPath"
        Write-Host ""
        
        # Launch crush.exe - use Start-Process to keep window open
        & $CrushExePath
    }
    catch {
        Write-Error "Failed to change directory or launch crush: $_"
        Read-Host "Press Enter to exit"
        exit 1
    }
}
else {
    Write-Host "No folder selected. Exiting."
    exit 0
}