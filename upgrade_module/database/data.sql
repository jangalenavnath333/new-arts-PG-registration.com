USE cet_exam;

INSERT INTO students (student_id, name, email, mobile, course, exam_status) VALUES 
('CET20261001', 'John Doe', 'john@example.com', '9876543210', 'B.Tech CS', 'PENDING'),
('CET20261002', 'Jane Smith', 'jane@example.com', '9876543211', 'MCA', 'COMPLETED'),
('CET20261003', 'Rahul Sharma', 'rahul@example.com', '9876543212', 'BBA', 'ACTIVE');

INSERT INTO applications (student_id, application_status, payment_status, twelfth_percent) VALUES
(1, 'APPROVED', 'PAID', 85.5),
(2, 'APPROVED', 'PAID', 92.0),
(3, 'APPROVED', 'PAID', 78.5);

INSERT INTO student_documents (student_id, document_type, file_url) VALUES
(1, 'PHOTO', 'https://example.com/docs/john_photo.jpg'),
(1, 'ID_PROOF', 'https://example.com/docs/john_id.pdf'),
(2, 'PHOTO', 'https://example.com/docs/jane_photo.jpg'),
(3, 'PHOTO', 'https://example.com/docs/rahul_photo.jpg');

INSERT INTO exam_attempts (student_id, start_time, end_time, total_time_spent, score, total_score, status) VALUES
(2, '2026-05-01 10:00:00', '2026-05-01 10:55:00', 3300, 45.0, 50.0, 'COMPLETED'),
(3, '2026-05-05 09:00:00', NULL, 1200, 15.0, 50.0, 'IN_PROGRESS');

INSERT INTO exam_answers (attempt_id, question_id, question_text, options, student_answer, correct_answer, marks, is_correct) VALUES
(1, 'Q1', 'What is React?', '["Library", "Framework", "Language", "Tool"]', 'Library', 'Library', 5.0, true),
(1, 'Q2', 'What is Spring Boot?', '["Library", "Framework", "Language", "Tool"]', 'Framework', 'Framework', 5.0, true);

INSERT INTO exam_issues (student_id, issue_type, message, admin_status) VALUES
(3, 'Network Problem', 'My internet disconnected during question 5.', 'PENDING');

INSERT INTO exam_security_logs (student_id, tab_switch_count, copy_paste_attempt, fullscreen_exit_count) VALUES
(1, 0, 0, 0),
(2, 1, 0, 1),
(3, 3, 1, 2);
