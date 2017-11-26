// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.

import path from "path";
import url from "url";
import fs from "fs";
import { app, Menu, dialog } from "electron";
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
  const fileMenuTemplate = {
    label: "File",
    submenu: [
      { label: "Open File(s)", accelerator: "CmdOrCtrl+O", click: function () { openFileDialog(false) } },
      { label: "Open Folder", accelerator: "CmdOrCtrl+F", click: function () { openFileDialog(true) } }
    ]
  };

  function openFileDialog(selectFolder) {
    var selection, fileFilters;
    if (selectFolder) {
      selection = 'openDirectory';
      fileFilters = [{ name: 'All Files', extensions: ['*'] }];
    } else {
      selection = 'multiSelections';
      fileFilters = [{ name: 'Audio', extensions: ['flac', 'mp3', 'm4a', 'ogg', 'wav', 'aif', 'aiff'] }];
    }
    dialog.showOpenDialog(mainWindow, {
      properties: [selection],
      filters: fileFilters
    }, function (result) {
      var filelist, imglist;
      if (!selectFolder) {
        filelist = result;
        mainWindow.webContents.send('modal-filelist', { files: filelist });
      } else {
        var rootpath = result[0];
        fs.readdir(rootpath, function (err, files) {
          var fullpath;
          filelist = [];
          imglist = [];
          for (var i = 0; i < files.length; i++) {
            var item = {};
            fullpath = path.join(rootpath, files[i]);
            if (files[i].match(/\.(?:flac|wav|mp3|m4a|ogg|aif|aiff)$/i)) {
              item.path = fullpath;
              filelist.push(item);
            } else if (files[i].match(/\.(?:png|jpg|jpeg|gif)$/i)) {
              imglist.push(fullpath);
            }
          }
          mainWindow.webContents.send('modal-filelist', { files: filelist, images: imglist });
        });
      }
    })
  }

  const setApplicationMenu = () => {
    const menus = [fileMenuTemplate, editMenuTemplate];
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
    height: 350
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

app.on("window-all-closed", () => {
  app.quit();
});
