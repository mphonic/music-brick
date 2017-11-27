import "./stylesheets/main.css";

import "./helpers/context_menu.js";
import "./helpers/external_links.js";

import { remote } from "electron";
import jetpack from "fs-jetpack";
// import env from "env";

import angular from "angular";
// import angularfilter from 'angular-filter';

const app = remote.app;
const appDir = jetpack.cwd(app.getAppPath());

import Player from "./features/player.controller.js";
import PlaylistController from "./features/playlist.controller.js";
import PlaylistLink from "./features/playlist.link.js";

export default angular.module('audiotron', [])
  .controller('Player', Player)
  .directive('playlist', function () {
    return {
      restrict: 'E',
      scope: {
        player: '='
      },
      templateUrl: './features/playlist.template.html',
      controller: PlaylistController,
      controllerAs: 'playlist',
      link: PlaylistLink
    }
  });