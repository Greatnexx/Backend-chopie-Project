import { menuUpload, logoUpload, bannerUpload } from '../config/cloudinary.js';

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Export the configured multer uploads
export const upload = menuUpload;
export const uploadLogo = logoUpload;
export const uploadBanner = bannerUpload;

export default upload;