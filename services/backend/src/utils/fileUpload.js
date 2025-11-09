const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Local storage for development
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// S3 storage for production
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET,
  acl: 'private',
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const folder = req.uploadFolder || 'general';
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, `${folder}/${uniqueName}`);
  }
});

// File filter
const fileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    const allowedMimeTypes = allowedTypes || [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX'), false);
    }
  };
};

// Multer configuration
const upload = (options = {}) => {
  const storage = process.env.NODE_ENV === 'production' ? s3Storage : localStorage;
  
  return multer({
    storage: storage,
    limits: {
      fileSize: options.maxSize || 5 * 1024 * 1024 // 5MB default
    },
    fileFilter: fileFilter(options.allowedTypes)
  });
};

// Generate signed URL for private S3 files
async function generateSignedUrl(key, expiresIn = 3600) {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Expires: expiresIn
    };
    return await s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    throw new Error('Failed to generate signed URL');
  }
}

// Delete file from S3
async function deleteFromS3(key) {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key
    };
    await s3.deleteObject(params).promise();
  } catch (error) {
    throw new Error('Failed to delete file from S3');
  }
}

module.exports = { upload, generateSignedUrl, deleteFromS3 };
