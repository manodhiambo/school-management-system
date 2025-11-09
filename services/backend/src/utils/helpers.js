const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generateAdmissionNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `ADM${currentYear}`;
  
  const lastStudent = await prisma.students.findFirst({
    where: {
      admission_number: {
        startsWith: prefix
      }
    },
    orderBy: {
      admission_number: 'desc'
    }
  });

  let sequence = 1;
  if (lastStudent && lastStudent.admission_number) {
    const lastNumber = parseInt(lastStudent.admission_number.slice(-4));
    sequence = lastNumber + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

async function generateEmployeeId() {
  const currentYear = new Date().getFullYear();
  const prefix = `EMP${currentYear}`;
  
  const lastTeacher = await prisma.teachers.findFirst({
    where: {
      employee_id: {
        startsWith: prefix
      }
    },
    orderBy: {
      employee_id: 'desc'
    }
  });

  let sequence = 1;
  if (lastTeacher && lastTeacher.employee_id) {
    const lastNumber = parseInt(lastTeacher.employee_id.slice(-4));
    sequence = lastNumber + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
}

function calculateAge(dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  
  if (format === 'DD-MM-YYYY') {
    return `${day}-${month}-${year}`;
  }
  
  return `${year}-${month}-${day}`;
}

function validateIndianPhone(phone) {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

function validateAadhar(aadhar) {
  const aadharRegex = /^\d{12}$/;
  return aadharRegex.test(aadhar);
}

function validatePAN(pan) {
  const panRegex = /^[A-Z]{5}\d{4}[A-Z]{1}$/;
  return panRegex.test(pan);
}

function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input.replace(/[<>]/g, '').trim();
  }
  return input;
}

module.exports = {
  generateAdmissionNumber,
  generateEmployeeId,
  calculateAge,
  formatDate,
  validateIndianPhone,
  validateAadhar,
  validatePAN,
  sanitizeInput
};
