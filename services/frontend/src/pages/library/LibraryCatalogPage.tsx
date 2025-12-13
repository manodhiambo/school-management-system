import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Book, Search, BookOpen, Calendar, User } from 'lucide-react';
import libraryAPI from '@/services/library-api';

export function LibraryCatalogPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [searchTerm, selectedCategory, showAvailableOnly, books]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [booksRes, categoriesRes] = await Promise.all([
        libraryAPI.getBooks({ limit: 1000 }),
        libraryAPI.getCategories()
      ]);

      console.log('Books response:', booksRes);
      console.log('Categories response:', categoriesRes);

      const booksData = booksRes?.data?.data || booksRes?.data || [];
      const categoriesData = categoriesRes?.data?.data || categoriesRes?.data || [];

      console.log('Extracted books:', booksData);
      console.log('Extracted categories:', categoriesData);

      setBooks(Array.isArray(booksData) ? booksData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error: any) {
      console.error('Error loading library data:', error);
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
        book.description?.toLowerCase().includes(search)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(book => book.category === selectedCategory);
    }

    if (showAvailableOnly) {
      filtered = filtered.filter(book => book.available_copies > 0);
    }

    setFilteredBooks(filtered);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    filterBooks();
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
      <div>
        <h2 className="text-3xl font-bold">Library Catalog</h2>
        <p className="text-gray-500">Browse and search for books</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
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
              <Button type="submit">Search</Button>
            </div>

            <div className="flex gap-4 flex-wrap items-center">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category} ({cat.count})
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAvailableOnly}
                  onChange={(e) => setShowAvailableOnly(e.target.checked)}
                  className="rounded"
                />
                <span>Available only</span>
              </label>

              {(searchTerm || selectedCategory || showAvailableOnly) && (
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => { 
                    setSearchTerm(''); 
                    setSelectedCategory(''); 
                    setShowAvailableOnly(false);
                  }}
                >
                  Clear Filters
                </Button>
              )}

              <div className="ml-auto text-sm text-gray-500">
                Showing {filteredBooks.length} of {books.length} books
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Books Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredBooks.map((book) => (
          <Card key={book.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="p-0">
              {book.cover_image_url ? (
                <img 
                  src={book.cover_image_url} 
                  alt={book.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-500 rounded-t-lg flex items-center justify-center">
                  <Book className="h-16 w-16 text-white" />
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg line-clamp-2 mb-1">{book.title}</h3>
                  {book.subtitle && (
                    <p className="text-sm text-gray-500 line-clamp-1">{book.subtitle}</p>
                  )}
                </div>
                <Badge variant={book.available_copies > 0 ? 'default' : 'secondary'}>
                  {book.available_copies > 0 ? 'Available' : 'Unavailable'}
                </Badge>
              </div>

              <div className="space-y-2 mt-3">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="line-clamp-1">{book.author}</span>
                </div>

                {book.category && (
                  <div className="flex items-center text-sm text-gray-600">
                    <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{book.category}</span>
                  </div>
                )}

                {book.isbn && (
                  <div className="text-xs text-gray-500">
                    ISBN: {book.isbn}
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Copies:</span>
                    <span className={`font-medium ${book.available_copies > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {book.available_copies} / {book.total_copies}
                    </span>
                  </div>
                </div>

                {book.description && (
                  <p className="text-sm text-gray-600 line-clamp-3 pt-2">
                    {book.description}
                  </p>
                )}

                {book.is_reference_only && (
                  <Badge variant="outline" className="w-full justify-center mt-2">
                    Reference Only
                  </Badge>
                )}

                {book.location && (
                  <div className="text-xs text-gray-500 pt-2">
                    Location: {book.location}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBooks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Book className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No books found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchTerm || selectedCategory || showAvailableOnly 
                ? 'Try adjusting your search or filters' 
                : 'The library catalog is empty'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
