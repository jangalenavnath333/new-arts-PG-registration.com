const fs = require('fs');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

const missingStudents = [
    { name: "Vaishnavi Bhusal", email: "bhusalvaishnavi@gmail.com", mobile: "+919209372456", course: "MSC-CS" },
    { name: "Aditi Luniya", email: "luniyaaaditi83@gmail.com", mobile: "+919270550951", course: "MSC-CS" },
    { name: "Siddhi Sangale", email: "siddhisangale2022@gmail.com", mobile: "+918080980597", course: "MSC-CS" },
    { name: "Sakshi Salunke", email: "sakshisalunke162004@gmail.com", mobile: "+919370860426", course: "MSC-CA" }
];

// Generate Excel
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(missingStudents);
xlsx.utils.book_append_sheet(wb, ws, "Missing Students");
xlsx.writeFile(wb, "C:/CET EXAM ONLINE/Missing_Students_List.xlsx");
console.log("Excel created!");

// Generate PDF
const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream('C:/CET EXAM ONLINE/Missing_Students_List.pdf'));

doc.fontSize(20).text('Missing Students from Old PDFs', { align: 'center' });
doc.moveDown(2);

missingStudents.forEach((student, i) => {
    doc.fontSize(14).text(`${i + 1}. Name: ${student.name}`);
    doc.fontSize(12).text(`    Email: ${student.email}`);
    doc.fontSize(12).text(`    Mobile: ${student.mobile}`);
    doc.fontSize(12).text(`    Course: ${student.course || 'Unknown'}`);
    doc.moveDown();
});

doc.end();
console.log("PDF created!");
