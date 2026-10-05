// Minimal pure Node.js PNG generator using built-in zlib
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    for (let j = 0; j < 8; j++) {
      if ((crc ^ byte) & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
      byte = byte >>> 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crc]);
}

function createVocabIconPNG(size) {
  // Create RGBA image buffer
  // Background: gradient purple/indigo (#6366F1 to #4F46E5) with a stylish 'V' badge
  const width = size;
  const height = size;
  const rawData = [];

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    rawData.push(0); // PNG scanline filter byte: 0 = None
    for (let x = 0; x < width; x++) {
      // Rounded squircle background
      const dx = Math.abs(x - center);
      const dy = Math.abs(y - center);
      const cornerRadius = size * 0.22;
      const innerW = center - cornerRadius;
      const innerH = center - cornerRadius;

      let insideBg = false;
      if (dx <= innerW && dy <= center) insideBg = true;
      else if (dx <= center && dy <= innerH) insideBg = true;
      else {
        const cdx = dx - innerW;
        const cdy = dy - innerH;
        if (cdx * cdx + cdy * cdy <= cornerRadius * cornerRadius) insideBg = true;
      }

      if (!insideBg) {
        rawData.push(0, 0, 0, 0); // transparent
        continue;
      }

      // Inside icon background: sleek purple to indigo gradient
      const gradientT = (x + y) / (width + height);
      let r = Math.round(99 * (1 - gradientT) + 67 * gradientT);   // 6366f1 to 4338ca
      let g = Math.round(102 * (1 - gradientT) + 56 * gradientT);
      let b = Math.round(241 * (1 - gradientT) + 202 * gradientT);
      let a = 255;

      // Draw "V" logo symbol
      // Normalize coords to [-1, 1]
      const nx = (x - center) / (size * 0.32);
      const ny = (y - center) / (size * 0.32);

      // 'V' shape: Left bar from (-0.8, -0.7) to (0, 0.75), Right bar from (0.8, -0.7) to (0, 0.75)
      // Distance to V-lines:
      const leftDist = Math.abs((ny - 0.75) * (-0.8) - (nx - 0) * (-1.45)) / Math.sqrt(0.8 * 0.8 + 1.45 * 1.45);
      const rightDist = Math.abs((ny - 0.75) * (0.8) - (nx - 0) * (-1.45)) / Math.sqrt(0.8 * 0.8 + 1.45 * 1.45);

      const inLeftBranch = nx <= 0.1 && ny >= -0.75 && ny <= 0.8 && leftDist < 0.28;
      const inRightBranch = nx >= -0.1 && ny >= -0.75 && ny <= 0.8 && rightDist < 0.28;

      // Small bookmark accent at top-right or dot
      const isDot = Math.hypot(nx - 0.65, ny - (-0.65)) < 0.2;

      if (inLeftBranch || inRightBranch) {
        // Bright crisp white letter V
        r = 255;
        g = 255;
        b = 255;
      } else if (isDot) {
        // Vibrant emerald accent dot
        r = 52;
        g = 211;
        b = 153;
      }

      rawData.push(r, g, b, a);
    }
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT chunk
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 32, 48, 128].forEach((size) => {
  const png = createVocabIconPNG(size);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png (${size}x${size})`);
});
