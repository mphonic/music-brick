import Store from "electron-store";

const store = new Store();

export default function PlayerControlLink(scope, element) {
    var player = scope.player;

    scope.clientSeek = function (e) {
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

    angular.element(document.querySelector('body')).bind('keyup', function (e) {
        e.preventDefault();
        // console.log(e.keyCode);
        switch (e.keyCode) {
            case 32:
                player.togglePlayPause();
                break;
            case 40:
                player.focusedItem = Math.min(player.focusedItem + 1, player.playlist.length - 1);
                break;
            case 38:
                player.focusedItem = Math.max(player.focusedItem - 1, 0);
                break;
            case 13:
                if (player.focusedItem !== scope.currentIndex) {
                    player.play(player.focusedItem);
                }
                break;
            case 39:
                player.ff();
                break;
            case 37:
                player.rw();
                break;
            case 8 || 46:
                scope.removeFocusedItem();
                break;
        }
        scope.$apply();
    });

    window.onbeforeunload = function(e) {
        store.set('defaultPlaylist', player.playlist);
    }
}