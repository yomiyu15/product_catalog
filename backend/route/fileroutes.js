// fileroutes.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fileController = require('../controller/filecontroller');  // Ensure correct path

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { folderPath } = req.body;
    const folderDirectory = path.join(__dirname, "../uploads", folderPath || "");
    ensureDirectoryExists(folderDirectory);
    cb(null, folderDirectory);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

// Helper function to ensure directory exists
const ensureDirectoryExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// POST route for file upload
router.post('/upload-file', upload.single('file'), fileController.uploadFile);
router.get('/view-pdf', (req, res) => {
  const { folderPath, fileName } = req.query;
  console.log('Received query params:', req.query);  // Log all query params

  if (!folderPath || !fileName) {
    console.error('Missing folderPath or fileName');
    return res.status(400).json({ message: 'Folder and file parameters are required' });
  }

  // Construct the path dynamically
  const filePath = path.join(__dirname, '../uploads', folderPath, fileName);
  console.log('Constructed file path:', filePath);

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return res.status(404).json({ message: 'File not found' });
  }

  // Send the file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving PDF:', err);
      return res.status(500).json({ message: 'Error retrieving PDF' });
    }
  });
});


const getAllFiles = (dirPath, arrayOfFiles = []) => {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      const relativePath = path.relative(path.join(__dirname, '../uploads'), filePath).replace(/\\/g, '/');

      // Split the relative path to get folderPath and fileName separately
      const [folderPath, fileName] = relativePath.split('/').reduce((acc, part, index, arr) => {
        if (index === arr.length - 1) {
          acc[1] = part; // fileName (last part)
        } else {
          acc[0] = acc[0] ? acc[0] + '/' + part : part; // folderPath (all parts except the last one)
        }
        return acc;
      }, []);

      arrayOfFiles.push({
        name: file,
        path: relativePath,  // Relative path from uploads folder
        viewUrl: `http://localhost:5000/api/files/view-pdf?folderPath=${encodeURIComponent(folderPath)}&fileName=${encodeURIComponent(fileName)}`
      });
    }
  });

  return arrayOfFiles;
};



// Route to list all files starting from the root uploads directory
router.get('/list-all-files', (req, res) => {
  const rootDirectory = path.join(__dirname, '../uploads');
  const { search } = req.query; // Capture search query

  if (!fs.existsSync(rootDirectory)) {
    return res.status(404).json({ message: 'Root folder not found' });
  }

  try {
    let allFiles = getAllFiles(rootDirectory);

    // If search query is provided, filter files by filename
    if (search) {
      allFiles = allFiles.filter(file => 
        file.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json(allFiles);
  } catch (error) {
    console.error('Error listing all files:', error);
    res.status(500).json({ message: 'Error retrieving file list' });
  }
});

// Route to view a specific PDF file by its path
router.get('/view', (req, res) => {
  const { filePath } = req.query; // filePath from the query string

  if (!filePath) {
    return res.status(400).json({ message: 'File path is required' });
  }

  const fullPath = path.join(__dirname, '../uploads', filePath); // Full path to the file

  // Check if the file exists
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ message: 'File not found' });
  }

  // Send the file to the client
  res.sendFile(fullPath, (err) => {
    if (err) {
      console.error('Error serving PDF:', err);
      return res.status(500).json({ message: 'Error retrieving PDF' });
    }
  });
});


module.exports = router;

