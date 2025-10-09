const sharp = require('sharp');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  sharp('public/logo2.png')
    .resize(size, size)
    .toFile(`public/icons/icon-${size}x${size}.png`);
});