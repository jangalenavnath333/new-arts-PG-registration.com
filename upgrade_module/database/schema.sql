CREATE DATABASE IF NOT EXISTS cet_exam;
USE cet_exam;

CREATE TABLE students (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile VARCHAR(20),
    course VARCHAR(100),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exam_status ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'BLOCKED') DEFAULT 'PENDING',
    status ENUM('ACTIVE', 'DELETED') DEFAULT 'ACTIVE'
);

CREATE TABLE applications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    application_status VARCHAR(50),
    payment_status VARCHAR(50),
    twelfth_percent DECIMAL(5,2),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE student_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    document_type VARCHAR(50),
    file_url VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE exam_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    total_time_spent INT DEFAULT 0, -- in seconds
    score DECIMAL(5,2) DEFAULT 0.0,
    total_score DECIMAL(5,2) DEFAULT 0.0,
    last_saved_question_index INT DEFAULT 0,
    remaining_time INT,
    status ENUM('IN_PROGRESS', 'COMPLETED', 'TERMINATED') DEFAULT 'IN_PROGRESS',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE exam_answers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    question_id VARCHAR(50),
    question_text TEXT,
    options JSON,
    student_answer VARCHAR(255),
    correct_answer VARCHAR(255),
    marks DECIMAL(5,2),
    is_correct BOOLEAN,
    FOREIGN KEY (attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE
);

CREATE TABLE exam_issues (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    issue_type VARCHAR(50),
    message TEXT,
    screenshot_url VARCHAR(255),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_status ENUM('PENDING', 'RESOLVED', 'REJECTED') DEFAULT 'PENDING',
    admin_remarks TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE exam_security_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    tab_switch_count INT DEFAULT 0,
    copy_paste_attempt INT DEFAULT 0,
    right_click_attempt INT DEFAULT 0,
    fullscreen_exit_count INT DEFAULT 0,
    network_disconnect_count INT DEFAULT 0,
    warning_count INT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);
