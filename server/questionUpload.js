/**
 * Express Backend Script for Admin Question Upload
 * Handles CSV/Excel parsing and validation before database insertion
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const { Question } = require('../models/Question'); // Assuming Mongoose model

// 1. Configure Multer for File Uploads
const upload = multer({ dest: 'uploads/' });

/**
 * @route   POST /api/admin/upload-questions
 * @desc    Upload questions via CSV or Excel
 * @access  Admin Only
 */
router.post('/upload-questions', upload.single('file'), async (req, res) => {
    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    let questionsBuffer = [];

    try {
        if (fileExtension === 'csv') {
            // Handle CSV Parsing
            await new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row) => questionsBuffer.push(row))
                    .on('end', resolve)
                    .on('error', reject);
            });
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            // Handle Excel (XLSX/XLS) Parsing
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            questionsBuffer = xlsx.utils.sheet_to_json(worksheet);
        } else {
            return res.status(400).json({ error: 'Unsupported file format. Use CSV or Excel.' });
        }

        // 2. Validation Logic
        const validatedQuestions = [];
        const errors = [];

        questionsBuffer.forEach((row, index) => {
            const { subject, text, option1, option2, option3, option4, correctIndex } = row;

            // Check for empty fields
            if (!subject || !text || !option1 || !option2 || !option3 || !option4 || correctIndex === undefined) {
                errors.push(`Row ${index + 1}: Missing required fields.`);
                return;
            }

            // Ensure correctIndex is a valid number (0-3)
            const idx = parseInt(correctIndex);
            if (isNaN(idx) || idx < 0 || idx > 3) {
                errors.push(`Row ${index + 1}: Invalid correctIndex (must be 0, 1, 2, or 3).`);
                return;
            }

            validatedQuestions.push({
                subject,
                text,
                options: [option1, option2, option3, option4],
                correct: idx,
                createdAt: new Date()
            });
        });

        if (errors.length > 0) {
            fs.unlinkSync(filePath); // Cleanup temp file
            return res.status(400).json({ 
                message: 'Validation failed for some rows.', 
                errors 
            });
        }

        // 3. Batch Database Insertion
        if (validatedQuestions.length > 0) {
            await Question.insertMany(validatedQuestions);
        }

        // Cleanup and Response
        fs.unlinkSync(filePath);
        res.status(200).json({ 
            message: `Successfully uploaded ${validatedQuestions.length} questions.`,
            count: validatedQuestions.length 
        });

    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error(err);
        res.status(500).json({ error: 'Server error during file processing.' });
    }
});

module.exports = router;
