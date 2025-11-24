const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' }));

// DIRECTORIES ------------------------
const UPLOAD_DIR = path.resolve(__dirname, 'uploads');
const CONVERTED_DIR = path.resolve(__dirname, 'media', 'converted');
const PUBLIC_MEDIA_DIR = path.resolve(__dirname, 'media');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(CONVERTED_DIR)) fs.mkdirSync(CONVERTED_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_MEDIA_DIR)) fs.mkdirSync(PUBLIC_MEDIA_DIR, { recursive: true });


// ----------------------
// DOWNLOAD REMOTE FILE
// ----------------------
async function downloadFromUrl(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(dest));
    writer.on('error', reject);
  });
}


// ----------------------
// FFPROBE META EXTRACT
// ----------------------
function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) return reject(err);
      try {
        const v = meta.streams.find((s) => s.codec_type === 'video');
        resolve({ width: v.width, height: v.height });
      } catch (e) {
        reject(new Error('Video stream not found'));
      }
    });
  });
}


// ----------------------
// FFmpeg CONVERSION 16:9
// ----------------------
function convertTo16x9(input, output) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions('-y')
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions('-preset', 'ultrafast')
      .outputOptions('-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,setsar=1,setdar=16/9')
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}


// ------------------------------------------------------------------
// 🔥 MAIN ENDPOINT — AUTO CONVERT REMOTE URL TO FULL 16:9 MP4
// ------------------------------------------------------------------
app.post('/convert-url', async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ success: false, error: "URL required" });

  try {
    const unique = uuidv4();
    const tempInput = path.join(UPLOAD_DIR, `${unique}.mp4`);
    const finalOutput = path.join(CONVERTED_DIR, `${unique}_16x9.mp4`);

    // 1. DOWNLOAD ------------------
    await downloadFromUrl(url, tempInput);

    // 2. CHECK META ----------------
    const meta = await probeVideo(tempInput);
    const isPortrait = meta.height > meta.width;

    // 3. CONVERT / COPY ------------
    if (!isPortrait) {
      fs.copyFileSync(tempInput, finalOutput);
    } else {
      await convertTo16x9(tempInput, finalOutput);
    }

    // 4. TEMP CLEANUP --------------
    setTimeout(() => {
      try { fs.unlinkSync(tempInput); } catch {}
      try { fs.unlinkSync(finalOutput); } catch {}
    }, 10 * 60 * 1000); // delete after 10 minutes

    // 5. RETURN READY-TO-PLAY URL --
    res.json({
      success: true,
      convertedUrl: `/media/converted/${path.basename(finalOutput)}`
    });

  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
});


// STATIC FILES
app.use('/media', express.static(PUBLIC_MEDIA_DIR));


// START SERVER
const PORT = 4000;
app.listen(PORT, () => console.log(`FFmpeg Auto Conversion Server running → http://localhost:${PORT}`));
