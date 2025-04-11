import express from 'express';
import { uploadFile, getFiles, deleteFile, renameFile, downloadFile } from '../controllers/fileController.js';
const router = express.Router();

router.post('/upload', uploadFile);
router.get('/', getFiles);
router.delete('/:id', deleteFile);
router.put('/:id', renameFile);
router.get('/download/:id', downloadFile);

export default router;
