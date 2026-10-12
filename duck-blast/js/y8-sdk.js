let y8Sdk = null;

window.addEventListener("y8sdk.ready", function () {
    y8Sdk = y8.sdk();

    y8Sdk.init(
        {
            appId: "YOUR_APP_ID",
            autoLogin: true
        },
        {
            gameId: "YOUR_GAME_ID",
            preloadAdBreaks: "on",
            sound: "on"
        }
    );
});
