#!/bin/bash

# Fix teacherService.js
sed -i 's/dateOfBirth,$/dateOfBirth || null,/g' src/services/teacherService.js
sed -i 's/qualification,$/qualification || null,/g' src/services/teacherService.js
sed -i 's/specialization,$/specialization || null,/g' src/services/teacherService.js
sed -i 's/experienceYears,$/experienceYears || null,/g' src/services/teacherService.js
sed -i 's/departmentId,$/departmentId || null,/g' src/services/teacherService.js
sed -i 's/designation,$/designation || null,/g' src/services/teacherService.js
sed -i 's/salaryGrade,$/salaryGrade || null,/g' src/services/teacherService.js
sed -i 's/basicSalary,$/basicSalary || null,/g' src/services/teacherService.js
sed -i 's/accountNumber,$/accountNumber || null,/g' src/services/teacherService.js
sed -i 's/ifscCode,$/ifscCode || null,/g' src/services/teacherService.js
sed -i 's/panNumber,$/panNumber || null,/g' src/services/teacherService.js
sed -i 's/aadharNumber,$/aadharNumber || null,/g' src/services/teacherService.js
sed -i 's/address,$/address || null,/g' src/services/teacherService.js
sed -i 's/city,$/city || null,/g' src/services/teacherService.js
sed -i 's/state,$/state || null,/g' src/services/teacherService.js
sed -i 's/pincode,$/pincode || null,/g' src/services/teacherService.js
sed -i 's/phone,$/phone || null,/g' src/services/teacherService.js
sed -i 's/JSON.stringify(emergencyContact),$/emergencyContact ? JSON.stringify(emergencyContact) : null,/g' src/services/teacherService.js
sed -i 's/isClassTeacher,$/isClassTeacher || false,/g' src/services/teacherService.js
sed -i 's/classId,$/classId || null,/g' src/services/teacherService.js
sed -i 's/sectionId$/sectionId || null/g' src/services/teacherService.js

# Fix parentService.js
sed -i 's/occupation,$/occupation || null,/g' src/services/parentService.js
sed -i 's/annualIncome,$/annualIncome || null,/g' src/services/parentService.js
sed -i 's/education,$/education || null,/g' src/services/parentService.js
sed -i 's/address,$/address || null,/g' src/services/parentService.js
sed -i 's/city,$/city || null,/g' src/services/parentService.js
sed -i 's/state,$/state || null,/g' src/services/parentService.js
sed -i 's/pincode,$/pincode || null,/g' src/services/parentService.js
sed -i 's/phoneSecondary,$/phoneSecondary || null,/g' src/services/parentService.js
sed -i 's/emailSecondary,$/emailSecondary || null,/g' src/services/parentService.js
sed -i 's/aadharNumber$/aadharNumber || null/g' src/services/parentService.js

echo "Services fixed!"
