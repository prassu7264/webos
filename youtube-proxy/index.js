const express = require("express");

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/watch", (req, res) => {
  const videoId = req.query.v || "";
  if (!videoId)
    return res.status(400).send("Missing YouTube video ID (?v=VIDEO_ID)");

  res.send(`
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>YouTube Proxy Player</title>
    <style>
      html, body, #player {
        width: 100%;
        height: 100%;
        margin: 0;
        background-color: black;
      }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
      function onYouTubeIframeAPIReady() {
        new YT.Player("player", {
          videoId: "${videoId}",
          playerVars: { autoplay: 1, controls: 1, origin: location.origin },
        });
      }
    </script>
  </body>
</html>
  `);
});

app.listen(3000, () => console.log("Proxy running locally on port 3000"));

module.exports = app; // ✅ This line is critical for Vercel
