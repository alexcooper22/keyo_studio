#!/usr/bin/env node
// Copies @ffmpeg/core WASM files to public/ffmpeg/ so they're served
// from our own domain (no CDN dependency, no CORS issues).
const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '../node_modules/@ffmpeg/core/dist/umd')
const dst = path.join(__dirname, '../public/ffmpeg')

if (!fs.existsSync(src)) {
  console.log('copy-ffmpeg-core: @ffmpeg/core not installed, skipping')
  process.exit(0)
}

fs.mkdirSync(dst, { recursive: true })

const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm']
for (const file of files) {
  const s = path.join(src, file)
  const d = path.join(dst, file)
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, d)
    const size = (fs.statSync(d).size / 1024 / 1024).toFixed(1)
    console.log(`copy-ffmpeg-core: copied ${file} (${size} MB)`)
  }
}
