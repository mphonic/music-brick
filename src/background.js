// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from "path";
import url from "url";
import fs from "fs";
import { app, Menu, dialog, ipcMain } from "electron";
import { devMenuTemplate } from "./menu/dev_menu_template";
import { editMenuTemplate } from "./menu/edit_menu_template";
import createWindow from "./helpers/window";

// Special module holding environment variables which you declared
// in config/env_xxx.json file.
import env from "env";

// Save userData in separate folders for each environment.
// Thanks to this you can use production and development versions of the app
// on same machine like those are two separate apps.
if (env.name !== "production") {
  const userDataPath = app.getPath("userData");
  app.setPath("userData", `${userDataPath} (${env.name})`);
}

app.on("ready", () => {

  const setApplicationMenu = () => {
    const menus = [editMenuTemplate];
    if (env.name !== "production") {
      menus.push(devMenuTemplate);
      Menu.setApplicationMenu(Menu.buildFromTemplate(menus));
    } else {
      Menu.setApplicationMenu(null);
    }
  };

  setApplicationMenu();

  const mainWindow = createWindow("main", {
    width: 875,
    height: 360,
    backgroundColor: '#002b36',
    resizable: false,
    maximizable: false,
    darkTheme: true,
    thickFrame: false
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "app.html"),
      protocol: "file:",
      slashes: true
    })
  );

  if (env.name === "development") {
    mainWindow.openDevTools();
  }

});

// handling files on open
// let openedUrl = null;

// // open file in Windows
// if (process.platform == 'win32' && process.argv.length >= 2) {
//   openedUrl = process.argv[1];
// }

// // open file in macOS
// app.on('open-url', function (event, url) {
//   event.preventDefault();
//   openedUrl = url;
// });

// // send opened file to a requesting entity
// ipcMain.on('opened-with-file', function (event) {
//   event.returnValue = openedUrl;
// });

app.on("window-all-closed", () => {
  app.quit();
});
