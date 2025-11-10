const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});

prisma.$on('error', (e) => {
  console.error('Prisma error:', e);
});

module.exports = prisma;
