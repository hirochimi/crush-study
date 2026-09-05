' Crush Launcher Shortcut Creator
' Creates a shortcut to the Crush launcher on Desktop or specified location

Option Explicit

Dim WshShell, shortcut, desktopPath, targetPath, workDir, iconPath
Dim launchScript, userChoice

Set WshShell = CreateObject("WScript.Shell")

' Paths
targetPath = "C:\opt\l-llm\crush-study\launcher\crush-launcher.bat"
workDir = "C:\opt\l-llm\crush-study\launcher"
iconPath = "C:\opt\l-llm\crush-study\crush.exe"  ' Use crush.exe as icon

' Verify launcher exists
Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

If Not fso.FileExists(targetPath) Then
    MsgBox "Launcher not found at:" & vbCrLf & targetPath, vbCritical, "Error"
    WScript.Quit 1
End If

' Ask user where to create shortcut
userChoice = MsgBox("Where would you like to create the shortcut?" & vbCrLf & _
    "Yes = Desktop" & vbCrLf & _
    "No = Start Menu Programs" & vbCrLf & _
    "Cancel = Custom location", vbYesNoCancel + vbQuestion, "Create Crush Launcher Shortcut")

Select Case userChoice
    Case vbYes  ' Desktop
        desktopPath = WshShell.SpecialFolders("Desktop")
        shortcut = desktopPath & "\Crush Launcher.lnk"
        
    Case vbNo  ' Start Menu Programs
        desktopPath = WshShell.SpecialFolders("Programs")
        shortcut = desktopPath & "\Crush Launcher.lnk"
        
    Case vbCancel  ' Custom location
        Dim shellApp, folder
        Set shellApp = CreateObject("Shell.Application")
        Set folder = shellApp.BrowseForFolder(0, "Select folder for shortcut:", 0, WshShell.SpecialFolders("Desktop"))
        
        If folder Is Nothing Then
            MsgBox "No folder selected.", vbExclamation, "Cancelled"
            WScript.Quit 0
        End If
        
        desktopPath = folder.Self.Path
        shortcut = desktopPath & "\Crush Launcher.lnk"
        
    Case Else
        WScript.Quit 0
End Select

' Create the shortcut
Dim lnk
Set lnk = WshShell.CreateShortcut(shortcut)
lnk.TargetPath = targetPath
lnk.WorkingDirectory = workDir
lnk.IconLocation = iconPath & ",0"
lnk.Description = "Launch Crush with folder selection"
lnk.Save
lnk.iconLocation = "C:\opt\l-llm\crush-study\launcher\crush-launcher.ico,0"

MsgBox "Shortcut created at:" & vbCrLf & shortcut, vbInformation, "Success"