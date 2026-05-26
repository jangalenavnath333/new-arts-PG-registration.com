USE cet_exam;

ALTER TABLE students 
ADD COLUMN category VARCHAR(50) DEFAULT 'OPEN';

CREATE TABLE exam_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    course VARCHAR(100),
    category VARCHAR(50),
    total_marks DECIMAL(5,2),
    obtained_marks DECIMAL(5,2),
    percentage DECIMAL(5,2),
    rank_no INT,
    category_rank INT,
    status ENUM('PASSED', 'FAILED', 'ABSENT', 'PENDING', 'DISQUALIFIED') DEFAULT 'PENDING',
    time_taken INT, -- in seconds
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
