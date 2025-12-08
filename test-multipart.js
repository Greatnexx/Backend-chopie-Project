import express from 'express';
import multer from 'multer';
import cors from 'cors';

const app = express();
const upload = multer();

app.use(cors());

// Test endpoint for multipart data
app.post('/test-multipart', upload.single('image'), (req, res) => {
  console.log('=== TEST MULTIPART ===');
  console.log('Body:', req.body);
  console.log('File:', req.file);
  console.log('Content-Type:', req.get('Content-Type'));
  
  res.json({
    success: true,
    body: req.body,
    file: req.file ? { 
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : null
  });
});

app.listen(3001, () => {
  console.log('Test server running on port 3001');
});