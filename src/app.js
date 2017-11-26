import "./stylesheets/main.css";

import "./helpers/context_menu.js";
import "./helpers/external_links.js";

import { remote, ipcRenderer } from "electron";
import fs from "fs";
import path from "path";
import jetpack from "fs-jetpack";
// import env from "env";

import angular from "angular";
import angularfilter from 'angular-filter';
import howler from "howler";
import jsmediatags from "jsmediatags";
import Store from "electron-store";

const store = new Store();
const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());

function arrToBase64(arr) {
  var buf = new Uint8Array(arr);
  var binstr = Array.prototype.map.call(buf, function (ch) {
    return String.fromCharCode(ch);
  }).join('');
  return btoa(binstr);
}

const audiotron = angular.module('audiotron', [angularfilter])
  .controller('main', function($scope, $interval) {
    var player, loadFiles, processLoadedFiles, getProgress, startProgressTimer, stopProgressTimer;

    $scope.player = {
      playlist: [],
      nowPlaying: null,
      currentIndex: 0,
      focusedItem: 0,
      currentImage: null,
      paused: false,
      timer: null,
      progressPercent: '0%'
    };
    player = $scope.player;

    player.loadPlaylist = function(pl) {
      if (pl.length) {
        player.playlist = pl;
        if (player.playlist[0].tags.picture) {
          player.currentImage = "data:" + player.playlist[0].tags.picture.format + ";base64," + arrToBase64(player.playlist[0].tags.picture.data);
        } else {
          player.currentImage = player.playlist[0].images[0];
        }
      }
    }
    player.loadPlaylist(store.get('defaultPlaylist'));

    player.savePlaylist = function(name) {
      if (name) {
        var doIt = true;
        if (store.get('customPlaylists.' + name)) {
          doIt = confirm('Playlist exists. Overwrite?');
        } 
        if (doIt) {
          store.set('customPlaylists.' + name, player.playlist);
        }
      } else {
        alert('Please enter a playlist name.');
      }
    }

    player.getCustomPlaylists = function() {
      return store.get('customPlaylists');
    }

    getProgress = function () {
      if (!player.nowPlaying) return 0;
      var dur = player.nowPlaying.duration(),
        seek = player.nowPlaying.seek();
      if (dur === 0) return 0;
      return seek / dur;
    }
    startProgressTimer = function() {
      player.timer = $interval(function () {
        var progress = getProgress();
        player.progressPercent = (progress * 100) + '%';
      }, 200);
    };
    stopProgressTimer = function() {
      $interval.cancel(player.timer);
    }

    player.setFocusedItem = function(index, e) {
      // if (e.shiftKey)
      player.focusedItem = index;
    }

    player.play = function(index) {
      var item = player.playlist[index];
      if (!item.howl) {
        item.howl = new Howl({
          src: [item.path],
          html5: true,
          onend: function() {
            if (index < player.playlist.length - 1) {
              player.play(index + 1);
            }
          }
        });
      }
      if (player.nowPlaying) {
        player.nowPlaying.stop();
      }
      item.howl.play();
      player.nowPlaying = item.howl;
      player.currentIndex = index;
      player.focusedItem = index;
      if (item.tags.picture) {
        player.currentImage = "data:" + item.tags.picture.format + ";base64," + arrToBase64(item.tags.picture.data); 
      } else {
        player.currentImage = item.images[0];
      }
      player.paused = false;
      startProgressTimer();
    }

    player.togglePlayPause = function() {
      if (player.nowPlaying) {
        if (!player.paused) {
          player.paused = true;
          player.nowPlaying.pause();
          stopProgressTimer();
        } else {
          player.paused = false;
          player.nowPlaying.play();
          startProgressTimer();
        }
      } else {
        player.play(player.focusedItem);
      }
    }

    player.stop = function() {
      if (player.nowPlaying) {
        player.nowPlaying.stop();
        player.nowPlaying = null;
        player.currentIndex = 0;
        stopProgressTimer();
        player.progressPercent = '0%';
      }
    }

    player.rw = function() {
      if (player.nowPlaying) {
        if (player.nowPlaying.seek() > 1) {
          player.nowPlaying.seek(0);
        } else if (player.currentIndex > 0) {
          player.play(player.currentIndex - 1);
        }
      }
    }

    player.ff = function() {
      if (player.nowPlaying) {
        if (player.currentIndex < player.playlist.length - 1) {
          player.play(player.currentIndex + 1);
        }
      }
    }

    player.seek = function(time) {
      if (player.nowPlaying) {
        player.nowPlaying.seek(time);
      }
    }

    player.clientSeek = function(e) {
      e.stopPropagation();
      if (player.nowPlaying) {
        var target = angular.element(e.target);
        if (target.attr('class').match(/bar/)) {
          target = target.parent();
        }
        var r = (e.clientX - target[0].offsetParent.offsetLeft) / target[0].clientWidth;
        player.seek(r * player.nowPlaying.duration());
      }
    }

    player.clearPlaylist = function() {
      player.stop();
      player.playlist = [];
      store.set('defaultPlaylist', player.playlist);
    }

    player.handleKeyPress = function(e) {
      e.preventDefault();
      // console.log(e.keyCode);
      switch (e.keyCode) {
        case 32:
          player.togglePlayPause();
          break;
        case 110:
          player.focusedItem = Math.min(player.focusedItem + 1, player.playlist.length - 1);
          break;
        case 112:
          player.focusedItem = Math.max(player.focusedItem - 1, 0);
          break;
        case 13:
          if (player.focusedItem !== player.currentIndex) {
            player.play(player.focusedItem);
          }
          break;
        case 102:
          player.ff();
          break;
        case 114:
          player.rw();
          break;
        case 100:
          player.removeFocusedItem();
          break;
      };
    }

    player.removeFocusedItem = function() {
      var index = player.focusedItem;
      if (player.focusedItem === player.currentIndex && player.nowPlaying) {
        player.stop();
      }
      player.playlist.splice(player.focusedItem, 1);
      player.focusedItem = Math.max(index - 1, 0);
      if (player.currentIndex > index) {
        player.currentIndex = player.currentIndex - 1;
      }
      store.set('defaultPlaylist', player.playlist);
    }

    processLoadedFiles = function(arr, iter, final) {
      var item = arr[iter];
      jsmediatags.read(item.path, {
        onSuccess: function (tags) {
          for (var key in tags) {
            item[key] = tags[key];
          }
          if (!item.tags.title) {
            item.tags.title = path.basename(item.path);
          }
          item.images = player.tmpimages;
          player.tmplist.push(item);
          if (iter === final) {
            player.tmplist.sort(function(a, b) {
              return parseInt(a.tags.track) - parseInt(b.tags.track);
            });

            if (player.playlist.length < 1) {
              if (player.tmplist[0].tags.picture) {
                player.currentImage = "data:" + player.tmplist[0].tags.picture.format + ";base64," + arrToBase64(player.tmplist[0].tags.picture.data); 
              } else {
                player.currentImage = player.tmplist[0].images[0];
              }
            }
            player.playlist = player.playlist.concat(player.tmplist);
            $scope.$apply();
            store.set('defaultPlaylist', player.playlist);
          } else {
            processLoadedFiles(arr, iter + 1, final);
          }
        },
        onError: function (error) {
          item.tags = {
            title: path.basename(item.path),
            track: path.basename(item.path)
          }
          if (iter === final) {
            $scope.$apply();
            store.set('defaultPlaylist', player.playlist);
          } else {
            processLoadedFiles(arr, iter + 1, final);
          }
        }
      });
    }

    player.openFiles = function() {
      var dialog = remote.dialog;
      dialog.showOpenDialog({
        properties: ['multiSelections'],
        filters: [{ name: 'Audio', extensions: ['flac', 'mp3', 'm4a', 'ogg', 'wav', 'aif', 'aiff'] }]
      }, function (result) {
        var arr = [];
        angular.forEach(result, function(e, c) {
          arr.push({ path: e });
        });
        loadFiles({ files: arr });
      });
    }

    player.openFolder = function() {
      var dialog = remote.dialog;
      dialog.showOpenDialog({
        properties: ['openDirectory']
      }, function (result) {
        var filelist, imglist, rootpath;
        rootpath = result[0];
        fs.readdir(rootpath, function (err, files) {
          var fullpath;
          filelist = [];
          imglist = [];
          angular.forEach(files, function(e, c) {
            var item = {};
            fullpath = path.join(rootpath, e);
            if (e.match(/\.(?:flac|wav|mp3|m4a|ogg|aif|aiff)$/i)) {
              item.path = fullpath;
              filelist.push(item);
            } else if (e.match(/\.(?:png|jpg|jpeg|gif)$/i)) {
              imglist.push(fullpath);
            }
          });
          loadFiles({ files: filelist, images: imglist });
        });
      });
    }

    loadFiles = function(data) {
      player.tmplist = [];
      player.tmpimages = data.images;
      processLoadedFiles(data.files, 0, data.files.length - 1);
    }

    ipcRenderer.on('modal-filelist', function(event, data) {
      loadFiles(data);
    });
  });
