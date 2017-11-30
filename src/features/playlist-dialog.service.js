import { remote } from "electron";
import path from "path";
import fs from "fs";
import jsmediatags from "jsmediatags";
import angular from "angular";

export default class PlaylistDialog {

    constructor($q, $rootScope) {
        this.tmplist = [];
        this.tmpimages = [];
        this.$q = $q;
        this.$rootScope = $rootScope;
        this.q = null;
        this.totalFilesToLoad = 0;
        this.filesLoaded = 0;
        this.audioExtensions = ["mp3", "mpeg", "opus", "ogg", "oga", "wav", "aac", "caf", "m4a", "mp4", "weba", "webm", "dolby", "flac"];
    }

    initiateFileDialog(type) {
        this.q = this.$q.defer();
        if (type === 'folder') {
            this.openFolder();
        } else {
            this.openFiles();
        }
        return this.q.promise;
    }

    processLoadedFiles(arr, iter, final) {
        var item = arr[iter],
            self = this;
        jsmediatags.read(item.path, {
            onSuccess: (tags) => {
                for (var key in tags) {
                    item[key] = tags[key];
                }
                if (!item.tags.title) {
                    item.tags.title = path.basename(item.path);
                }
                if (!item.tags.track) {
                    item.tags.track = path.basename(item.path);
                }
                item.images = this.tmpimages;
                this.tmplist.push(item);
                if (iter === final) {
                    this.q.resolve(this.tmplist);
                } else {
                    this.filesLoaded++;
                    this.$rootScope.$broadcast('file-progress', { total: this.totalFilesToLoad, loaded: this.filesLoaded });
                    this.processLoadedFiles(arr, iter + 1, final);
                }
            },
            onError: (error) => {
                item.tags = {
                    title: path.basename(item.path),
                    track: path.basename(item.path)
                }
                this.tmplist.push(item);
                if (iter === final) {
                    this.q.resolve(this.tmplist);
                } else {
                    this.filesLoaded++;
                    this.$rootScope.$broadcast('file-progress', { total: this.totalFilesToLoad, loaded: this.filesLoaded });
                    this.processLoadedFiles(arr, iter + 1, final);
                }
            }
        });
    }

    openFileList(list, returnPromise) {
        var arr = [];
        this.q = this.$q.defer();
        angular.forEach(list, (e, c) => {
            if (this.isValidAudioFile(e.path)) {
                arr.push({ path: e.path });
            }
        });
        if (!arr.length) return;
        this.loadFiles({ files: arr });
        return this.q.promise;
    }

    loadFolderContent(folderpath, returnPromise) {
        var filelist, imglist, rootpath;
        rootpath = folderpath;
        if (returnPromise) this.q = this.$q.defer();
        fs.readdir(rootpath, (err, files) => {
            var fullpath;
            filelist = [];
            imglist = [];
            angular.forEach(files, (e, c) => {
                var item = {};
                fullpath = path.join(rootpath, e);
                if (this.isValidAudioFile(e)) {
                    item.path = fullpath;
                    filelist.push(item);
                } else if (this.isImageFile(e)) {
                    imglist.push(fullpath);
                }
            });
            this.loadFiles({ files: filelist, images: imglist });
        });
        if (returnPromise) return this.q.promise;
    }

    openFiles() {
        var dialog = remote.dialog;
        dialog.showOpenDialog({
            properties: ['multiSelections'],
            filters: [{ name: 'Audio Files', extensions: this.audioExtensions }]
        }, (result) => {
            if (!result) {
                this.q.resolve(404);
                return;
            }
            var arr = [];
            angular.forEach(result, function (e, c) {
                arr.push({ path: e });
            });
            this.loadFiles({ files: arr });
        });
    }

    openFolder() {
        var dialog = remote.dialog;
        dialog.showOpenDialog({
            properties: ['openDirectory']
        }, (result) => {
            if (!result) {
                this.q.resolve(404);
                return;
            }
            this.loadFolderContent(result[0]);
        });
    }

    loadFiles(data) {
        if (!data.files || !data.files.length) {
            this.q.reject('Some items lacked audio file content.');
            return;
        }
        this.tmplist = [];
        this.tmpimages = data.images;
        this.totalFilesToLoad = data.files.length;
        this.filesLoaded = 0;
        this.processLoadedFiles(data.files, 0, data.files.length - 1);
    }

    isValidAudioFile(path) {
        var filereg = RegExp("\.(?:" + this.audioExtensions.join('|') + ")$", "i");
        return path.match(filereg);
    }

    isImageFile(path) {
        return path.match(/\.(?:png|jpg|jpeg|gif)$/i);
    }
}