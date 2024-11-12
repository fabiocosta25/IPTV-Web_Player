// Define an array to store all playlist items
let playlistItems = [];
let player = null;

document.addEventListener("DOMContentLoaded", function() {
    const videoPlayer = document.getElementById("videoPlayer");
    const playlist = document.getElementById("playlist");
    const loadM3UButton = document.getElementById("loadM3U");
    const m3uURLInput = document.getElementById("m3uURL");
    const billedMsgElement = document.getElementById("billedMsg");
    const searchInput = document.getElementById("searchInput");

    // Get playlist URL from URL if any
    const urlParams = new URLSearchParams(window.location.search);
    const playlistParam = urlParams.get('playlist');
    if (playlistParam != null) {
        localStorage.setItem("m3uPlaylistURL", playlistParam);
    }

    // Load search input from local storage
    const savedPlaylistURL = localStorage.getItem("m3uPlaylistURL");
    if (savedPlaylistURL) {
        m3uURLInput.value = savedPlaylistURL;
        setTimeout(function() {
            loadM3UButton.click();
        }, 500);
    }

    loadM3UButton.addEventListener("click", () => {
        const m3uURL = m3uURLInput.value;
        localStorage.setItem("m3uPlaylistURL", m3uURL);

        fetch(m3uURL)
            .then(response => response.text())
            .then(data => {
                videoPlayer.innerHTML = '';
                clearPlaylist();
                const parsedPlaylist = parseM3U(data);
                playlistItems = parsedPlaylist.items;
                renderPlaylist(playlistItems);

                playlist.classList.toggle("d-none", document.getElementsByClassName('channel').length === 0);

                billedMsgElement.classList.toggle("d-none", !parsedPlaylist.billedMsg);
                billedMsgElement.textContent = parsedPlaylist.billedMsg;
            })
            .catch(error => console.error("Error loading the M3U file:", error));
    });

    searchInput.addEventListener("input", () => {
        const searchText = searchInput.value.trim().toLowerCase();
        const filteredItems = playlistItems.filter(item => item && item.tvgName && item.tvgName.toLowerCase().includes(searchText.toLowerCase()));
        clearPlaylist(false);
        renderPlaylist(filteredItems);
    });

    function renderPlaylist(items) {
        items.forEach((item, index) => {
            const playlistItem = document.createElement("div");
            playlistItem.className = "channel d-flex flex-column p-3";
            playlistItem.textContent = item.tvgName || `Stream ${index + 1}`;
            if (item.tvgLogo) {
                const logoImage = document.createElement("img");
                logoImage.src = item.tvgLogo;
                logoImage.className = "tv-logo";
                playlistItem.appendChild(logoImage);
            }
            playlistItem.addEventListener("click", async () => {
                clearErrorMessage();
                try {
                    if (player !== null) await player.destroy();
                    player = new shaka.Player(videoPlayer);
                    player.addEventListener('error', onPlayerError);
                    if (item.key) configureDRM(item);
                    await player.load(item.source);
                    videoPlayer.scrollIntoView({ behavior: 'smooth' });
                } catch (error) {
                    console.error('Error in renderPlaylist:', error);
                    onPlayerError(error);
                }
            });
            playlist.appendChild(playlistItem);
        });
    }

    function onPlayerError(error) {
        console.error('Detailed error information:', error);
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('video-error-message');
        errorMessage.textContent = `Error loading video: ${error.message || error.code}`;
        errorMessage.style.color = 'red';
        videoPlayer.parentNode.insertBefore(errorMessage, videoPlayer.nextSibling);
    }

    function clearErrorMessage() {
        const existingErrorMessage = document.querySelector('.video-error-message');
        if (existingErrorMessage) existingErrorMessage.remove();
    }

    function parseM3U(content) {
        const lines = content.split('\n');
        const items = [];
        let billedMsg = '';
        // Parse content here
        return { items, billedMsg };
    }

    function configureDRM(item) {
        if (item.key.license_type === 'clearkey' && item.key.license_key) {
            player.configure({ drm: { servers: { 'org.w3.clearkey': item.key.license_key } } });
        } else if (item.key.key_id && item.key.key) {
            player.configure({ drm: { clearKeys: { [item.key.key_id]: item.key.key } } });
        }
    }
});
