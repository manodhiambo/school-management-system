export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-IN');
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
