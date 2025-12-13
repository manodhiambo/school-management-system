import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Book, Plus, Edit, Trash2, BookOpen, Users, AlertCircle, Search, Scan, Upload, X } from 'lucide-react';
import libraryAPI from '@/services/library-api';

export function LibraryManagementPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  
  const [formData, setFormData] = useState({
    isbn: '',
    title: '',
    subtitle: '',
    author: '',
    co_authors: '',
    publisher: '',
    edition: '',
    publication_year: '',
    language: 'English',
    pages: '',
    category: '',
    sub_category: '',
    description: '',
    cover_image_url: '',
    location: '',
    total_copies: 1,
    price: '',
    condition: 'good',
    is_reference_only: false
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [searchTerm, filterCategory, books]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [booksRes, statsRes, catsRes] = await Promise.all([
        libraryAPI.getBooks({ limit: 1000 }),
        libraryAPI.getStatistics(),
        libraryAPI.getCategories()
      ]);

      const booksData = booksRes?.data?.data || booksRes?.data || [];
      const statsData = statsRes?.data?.data || statsRes?.data || null;
      const catsData = catsRes?.data?.data || catsRes?.data || [];

      setBooks(Array.isArray(booksData) ? booksData : []);
      setStatistics(statsData);
      setCategories(Array.isArray(catsData) ? catsData : []);
    } catch (error: any) {
      console.error('Error loading library data:', error);
      alert('Failed to load library data');
    } finally {
      setLoading(false);
    }
  };

  const filterBooks = () => {
    let filtered = [...books];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(book => 
        book.title?.toLowerCase().includes(search) ||
        book.author?.toLowerCase().includes(search) ||
        book.isbn?.toLowerCase().includes(search) ||
        book.category?.toLowerCase().includes(search)
      );
    }

    if (filterCategory) {
      filtered = filtered.filter(book => book.category === filterCategory);
    }

    setFilteredBooks(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBook) {
        await libraryAPI.updateBook(editingBook.id, formData);
        alert('Book updated successfully!');
      } else {
        await libraryAPI.addBook(formData);
        alert('Book added successfully!');
      }
      
      setShowAddModal(false);
      setEditingBook(null);
      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Error saving book:', error);
      alert(error?.response?.data?.message || error?.message || 'Failed to save book');
    }
  };

  const handleEdit = (book: any) => {
    setEditingBook(book);
    setFormData({
      isbn: book.isbn || '',
      title: book.title || '',
      subtitle: book.subtitle || '',
      author: book.author || '',
      co_authors: book.co_authors || '',
      publisher: book.publisher || '',
      edition: book.edition || '',
      publication_year: book.publication_year || '',
      language: book.language || 'English',
      pages: book.pages || '',
      category: book.category || '',
      sub_category: book.sub_category || '',
      description: book.description || '',
      cover_image_url: book.cover_image_url || '',
      location: book.location || '',
      total_copies: book.total_copies || 1,
      price: book.price || '',
      condition: book.condition || 'good',
      is_reference_only: book.is_reference_only || false
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    
    try {
      await libraryAPI.deleteBook(id);
      alert('Book deleted successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Error deleting book:', error);
      alert('Failed to delete book');
    }
  };

  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) {
      alert('Please enter a barcode or ISBN');
      return;
    }

    try {
      const response = await libraryAPI.searchByBarcode(barcodeInput);
      const book = response?.data?.data || response?.data;
      
      if (book) {
        handleEdit(book);
        setShowBarcodeModal(false);
        setBarcodeInput('');
      } else {
        // Book not found, pre-fill ISBN for new book
        resetForm();
        setFormData(prev => ({ ...prev, isbn: barcodeInput }));
        setShowBarcodeModal(false);
        setShowAddModal(true);
        setBarcodeInput('');
      }
    } catch (error: any) {
      console.error('Barcode search error:', error);
      // If not found, offer to add new book with this ISBN
      if (confirm('Book not found. Would you like to add it?')) {
        resetForm();
        setFormData(prev => ({ ...prev, isbn: barcodeInput }));
        setShowBarcodeModal(false);
        setShowAddModal(true);
      }
      setBarcodeInput('');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, we'll just use a placeholder. In production, you'd upload to S3/Cloudinary
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, cover_image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      isbn: '',
      title: '',
      subtitle: '',
      author: '',
      co_authors: '',
      publisher: '',
      edition: '',
      publication_year: '',
      language: 'English',
      pages: '',
      category: '',
      sub_category: '',
      description: '',
      cover_image_url: '',
      location: '',
      total_copies: 1,
      price: '',
      condition: 'good',
      is_reference_only: false
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Library Management</h2>
          <p className="text-gray-500">Manage books, borrowings, and library operations</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowBarcodeModal(true)}
          >
            <Scan className="h-4 w-4 mr-2" />
            Scan Barcode
          </Button>
          <Button onClick={() => { resetForm(); setEditingBook(null); setShowAddModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Book
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Books</CardTitle>
              <Book className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_books || 0}</div>
              <p className="text-xs text-gray-500">{statistics.total_copies || 0} total copies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <BookOpen className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.available_copies || 0}</div>
              <p className="text-xs text-gray-500">Copies available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Issued</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{statistics.books_issued || 0}</div>
              <p className="text-xs text-gray-500">Currently borrowed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{statistics.overdue_books || 0}</div>
              <p className="text-xs text-gray-500">
                KES {parseFloat(statistics.pending_fines || 0).toLocaleString()} fines
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title, author, ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 border rounded-md"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </option>
              ))}
            </select>
            {(searchTerm || filterCategory) && (
              <Button 
                variant="outline" 
                onClick={() => { setSearchTerm(''); setFilterCategory(''); }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Books Table */}
      <Card>
        <CardHeader>
          <CardTitle>Books Inventory ({filteredBooks.length} books)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Cover</th>
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">Author</th>
                  <th className="text-left py-3 px-4">Category</th>
                  <th className="text-left py-3 px-4">ISBN</th>
                  <th className="text-center py-3 px-4">Available/Total</th>
                  <th className="text-left py-3 px-4">Location</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {book.cover_image_url ? (
                        <img 
                          src={book.cover_image_url} 
                          alt={book.title}
                          className="h-12 w-8 object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-8 bg-gray-200 rounded flex items-center justify-center">
                          <Book className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{book.title}</p>
                        {book.subtitle && (
                          <p className="text-sm text-gray-500">{book.subtitle}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">{book.author}</td>
                    <td className="py-3 px-4">
                      {book.category && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {book.category}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{book.isbn || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {book.available_copies || 0} / {book.total_copies || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{book.location || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(book)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(book.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBooks.length === 0 && (
            <div className="text-center py-12">
              <Book className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No books found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchTerm || filterCategory ? 'Try adjusting your filters' : 'Click "Add Book" to get started'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barcode Scanner Modal */}
      <Dialog open={showBarcodeModal} onOpenChange={setShowBarcodeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Scan Barcode or ISBN
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Enter Barcode/ISBN</Label>
              <Input
                id="barcode"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan or type barcode..."
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch()}
              />
              <p className="text-xs text-gray-500">
                Use a barcode scanner or type the ISBN manually
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBarcodeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleBarcodeSearch}>
              Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Book Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Book Cover Upload */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0">
                {formData.cover_image_url ? (
                  <div className="relative">
                    <img 
                      src={formData.cover_image_url} 
                      alt="Book cover"
                      className="h-48 w-32 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => setFormData({...formData, cover_image_url: ''})}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-48 w-32 border-2 border-dashed rounded flex flex-col items-center justify-center bg-gray-50">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-xs text-gray-500 text-center px-2">Upload Cover</p>
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-2"
                />
              </div>

              {/* Basic Info */}
              <div className="flex-1 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Author *</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    value={formData.isbn}
                    onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Detailed Info */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="publisher">Publisher</Label>
                <Input
                  id="publisher"
                  value={formData.publisher}
                  onChange={(e) => setFormData({...formData, publisher: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edition">Edition</Label>
                <Input
                  id="edition"
                  value={formData.edition}
                  onChange={(e) => setFormData({...formData, edition: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publication_year">Publication Year</Label>
                <Input
                  id="publication_year"
                  type="number"
                  value={formData.publication_year}
                  onChange={(e) => setFormData({...formData, publication_year: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData({...formData, language: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pages">Pages</Label>
                <Input
                  id="pages"
                  type="number"
                  value={formData.pages}
                  onChange={(e) => setFormData({...formData, pages: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select Category</option>
                  <option value="Fiction">Fiction</option>
                  <option value="Non-Fiction">Non-Fiction</option>
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Literature">Literature</option>
                  <option value="Biography">Biography</option>
                  <option value="Reference">Reference</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sub_category">Sub-Category</Label>
                <Input
                  id="sub_category"
                  value={formData.sub_category}
                  onChange={(e) => setFormData({...formData, sub_category: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Shelf Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., A-12, B-5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_copies">Total Copies</Label>
                <Input
                  id="total_copies"
                  type="number"
                  min="1"
                  value={formData.total_copies}
                  onChange={(e) => setFormData({...formData, total_copies: parseInt(e.target.value)})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (KES)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  value={formData.condition}
                  onChange={(e) => setFormData({...formData, condition: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_reference_only}
                  onChange={(e) => setFormData({...formData, is_reference_only: e.target.checked})}
                  className="rounded"
                />
                <span>Reference Only (Cannot be borrowed)</span>
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingBook ? 'Update Book' : 'Add Book'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
