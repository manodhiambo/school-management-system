import api from './api';

class LibraryAPI {
  // Books
  getBooks(params?: any) {
    return api.api.get('/library/books', { params });
  }

  getBook(id: string) {
    return api.api.get(`/library/books/${id}`);
  }

  addBook(data: any) {
    return api.api.post('/library/books', data);
  }

  updateBook(id: string, data: any) {
    return api.api.put(`/library/books/${id}`, data);
  }

  deleteBook(id: string) {
    return api.api.delete(`/library/books/${id}`);
  }

  // Categories
  getCategories() {
    return api.api.get('/library/categories');
  }

  // Member
  getMember() {
    return api.api.get('/library/member');
  }

  getMyBorrowings() {
    return api.api.get('/library/my-borrowings');
  }

  // Borrowings (admin/librarian)
  getAllBorrowings(params?: any) {
    return api.api.get('/library/borrowings', { params });
  }

  issueBook(data: any) {
    return api.api.post('/library/issue', data);
  }

  returnBook(id: string, data: any) {
    return api.api.put(`/library/return/${id}`, data);
  }

  // Statistics
  getStatistics() {
    return api.api.get('/library/statistics');
  }
}

export default new LibraryAPI();
