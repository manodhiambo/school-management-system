import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Book, Search, Filter, BookOpen, Calendar, User } from 'lucide-react';
import libraryAPI from '@/services/library-api';

export function LibraryCatalogPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, [searchTerm, selectedCategory, showAvailableOnly]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (showAvailableOnly) params.available = 'true';

      const [booksRes, categoriesRes] = await Promise.all([
        libraryAPI.getBooks(params),
        libraryAPI.getCategories()
      ]);

      setBooks(booksRes.data.data || []);
      setCategories(categoriesRes.data.data || []);
    } catch (error: any) {
      console.error('Error loading library data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
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

            <div className="flex gap-4 flex-wrap">
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
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Books Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <Card key={book.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                  {book.subtitle && (
                    <p className="text-sm text-gray-500 mt-1">{book.subtitle}</p>
                  )}
                </div>
                <Badge variant={book.available_copies > 0 ? 'default' : 'secondary'}>
                  {book.available_copies > 0 ? 'Available' : 'Unavailable'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span>{book.author}</span>
                </div>

                {book.category && (
                  <div className="flex items-center text-sm text-gray-600">
                    <BookOpen className="h-4 w-4 mr-2" />
                    <span>{book.category}</span>
                  </div>
                )}

                {book.isbn && (
                  <div className="text-sm text-gray-500">
                    ISBN: {book.isbn}
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Copies:</span>
                    <span className="font-medium">
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
                  <Badge variant="outline" className="w-full justify-center">
                    Reference Only - Cannot be borrowed
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {books.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Book className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No books found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
