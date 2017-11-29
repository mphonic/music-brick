import "./stylesheets/main.css";
import "../node_modules/ng-sortable/dist/ng-sortable.min.css";

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
import PlaylistDialog from "./features/playlist-dialog.service.js";
import PlayerControl from "./features/player-control.controller.js";
import PlayerControlLink from "./features/player-control.link.js";
import PlayerKeyMap from "./features/player-keymap.link.js";

import assortable from "ng-sortable";
import swipe from "angular-swipe";

export default angular.module('audiotron', [require('angular-animate'), assortable, swipe.name])
  .controller('Player', Player)
  .service('PlaylistDialog', PlaylistDialog)
  .directive('playercontrol', function () {
    return {
      restrict: 'E',
      scope: {
        player: '='
      },
      templateUrl: './features/playlist.template.html',
      controller: PlayerControl,
      controllerAs: 'pc',
      link: PlayerControlLink
    }
  })
  .directive('playerkeymap', function () {
    return {
      restrict: 'A',
      scope: {
        pc: '=playercontrol'
      },
      link: PlayerKeyMap
    }
  });