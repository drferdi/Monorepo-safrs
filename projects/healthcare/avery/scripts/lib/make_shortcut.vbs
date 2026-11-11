Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\Avery Control Center.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "D:\DEV\Monorepo\projects\healthcare\avery\scripts\open-control-center.bat"
oLink.WorkingDirectory = "D:\DEV\Monorepo\projects\healthcare\avery\scripts"
oLink.Description = "Avery Sentra Control Center"
oLink.IconLocation = "shell32.dll,44"
oLink.Save
