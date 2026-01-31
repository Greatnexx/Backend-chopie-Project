import { logoUpload, bannerUpload } from '../config/cloudinary.js';

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

export const uploadBanner = bannerUpload;
export const uploadLogo = logoUpload;