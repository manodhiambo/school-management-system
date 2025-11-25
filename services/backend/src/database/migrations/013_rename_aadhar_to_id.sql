-- Rename aadhar_number to id_number for Kenyan context
ALTER TABLE students CHANGE COLUMN aadhar_number id_number VARCHAR(20);
ALTER TABLE teachers CHANGE COLUMN aadhar_number id_number VARCHAR(20);
ALTER TABLE parents CHANGE COLUMN aadhar_number id_number VARCHAR(20);
