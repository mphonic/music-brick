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

    scope.$watch('player.focusedItem', function(nv, ov) {
        var el = document.getElementById('playlist-' + nv),
            top,
            bottom,
            winHeight,
            pl,
            plTop,
            scrollTo;
        if (!el) return;
        top = el.getBoundingClientRect().top;
        bottom = el.getBoundingClientRect().bottom;
        winHeight = window.innerHeight;
        pl = document.getElementById('playlist');
        plTop = pl.getBoundingClientRect().top;
        if (bottom > winHeight) {
            scrollTo = bottom - plTop + pl.scrollTop + el.offsetHeight - pl.offsetHeight;
            pl.scrollTop = scrollTo;
        } else if (top < plTop) {
            scrollTo = top + pl.scrollTop - plTop;
            pl.scrollTop = scrollTo;
        }
    });

    angular.element(document.querySelector('body')).bind('keyup', function (e) {
        e.preventDefault();
        // console.log(e.keyCode);
        switch (e.keyCode) {
            case 32:
                player.togglePlayPause();
                break;
            case 78:
                player.focusedItem = Math.min(player.focusedItem + 1, player.playlist.length - 1);
                break;
            case 80:
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