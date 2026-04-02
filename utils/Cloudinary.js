const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// 🔑 Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🚀 Setup Multer to use Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "taskora_applications", // folder in your Cloudinary account
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = require("multer")({ storage });

module.exports = { cloudinary, upload };