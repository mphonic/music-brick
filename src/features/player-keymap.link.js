// handle keydown events
export default function PlayerKeyMap(scope, element, attrs) {
    var pc = scope.pc;
    element.bind('focus', (e) => {
        element.bind('keydown', (e) => {
            var isUsed = true, plr = pc.plr;

            switch (e.keyCode) {
                case 32:
                    plr.togglePlayPause();
                    break;
                case 40:
                    pc.setFocusedItem(Math.min(pc.focusedItem + 1, plr.playlist.length - 1));
                    break;
                case 38:
                    pc.setFocusedItem(Math.max(pc.focusedItem - 1, 0));
                    break;
                case 13:
                    if (pc.focusedItem !== plr.currentIndex) {
                        var rand = plr.random;
                        plr.random = false;
                        plr.play(pc.focusedItem);
                        plr.random = rand;
                    }
                    break;
                case 39:
                    plr.ff();
                    break;
                case 37:
                    plr.rw();
                    break;
                case 8 || 46:
                    pc.removeFocusedItem(plr);
                    break;
                case 70:
                    pc.openDialog('files');
                    break;
                case 68:
                    pc.openDialog('folder');
                    break;
                case 83:
                    pc.showPlaylistDialog = !pc.showPlaylistDialog;
                    break;
                case 80:
                    pc.showPlaylistMenu = !pc.showPlaylistMenu;
                    break;
                case 67:
                    pc.clearPlaylist();
                    break;
                default:
                    isUsed = false;
            }
            if (isUsed) e.preventDefault();
            scope.$apply();
        });
    });

    element.bind('blur', (e) => {
        element.unbind('keydown');
    });

    // focus element
    element[0].focus();

    scope.$watch('pc.showPlaylistDialog', (n,o) => {
        if (!n) {
            element[0].focus();
        }
    });

    scope.$watch('pc.showPlaylistMenu', (n, o) => {
        if (!n) {
            element[0].focus();
        }
    });
}