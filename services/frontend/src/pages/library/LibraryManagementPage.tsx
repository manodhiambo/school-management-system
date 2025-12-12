import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, Plus, BookOpen, Users, AlertCircle } from 'lucide-react';
import libraryAPI from '@/services/library-api';

export function LibraryManagementPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setDebugInfo('Starting to load data...');
      
      console.log('=== LOADING LIBRARY DATA ===');
      
      const booksRes = await libraryAPI.getBooks({ limit: 100 });
      console.log('RAW books response:', booksRes);
      console.log('Response type:', typeof booksRes);
      console.log('Response keys:', Object.keys(booksRes || {}));
      
      // Try different ways to extract the data
      let booksData = null;
      
      if (booksRes?.data?.data) {
        booksData = booksRes.data.data;
        setDebugInfo(`Found data at: response.data.data (${booksData.length} books)`);
      } else if (booksRes?.data) {
        booksData = booksRes.data;
        setDebugInfo(`Found data at: response.data (${Array.isArray(booksData) ? booksData.length : 'not array'} books)`);
      } else if (Array.isArray(booksRes)) {
        booksData = booksRes;
        setDebugInfo(`Response is directly an array (${booksData.length} books)`);
      } else {
        setDebugInfo(`Could not find books array. Response structure: ${JSON.stringify(Object.keys(booksRes || {}))}`);
      }
      
      console.log('Extracted books data:', booksData);
      console.log('Is array?', Array.isArray(booksData));
      console.log('Length:', booksData?.length);
      
      if (Array.isArray(booksData)) {
        console.log('First book:', booksData[0]);
        setBooks(booksData);
      } else {
        console.error('Books data is not an array!', booksData);
        setBooks([]);
      }

      // Load stats
      const statsRes = await libraryAPI.getStatistics();
      console.log('Stats response:', statsRes);
      const statsData = statsRes?.data?.data || statsRes?.data;
      setStatistics(statsData);
      
    } catch (error: any) {
      console.error('=== ERROR LOADING DATA ===');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error response:', error?.response);
      setDebugInfo(`ERROR: ${error?.message || 'Unknown error'}`);
      alert('Failed to load library data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading library data...</p>
        </div>
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
        <Button onClick={() => alert('Add book modal - coming soon')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </div>

      {/* Statistics */}
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

      {/* Debug Info - PROMINENT */}
      <Card className="border-4 border-blue-500 bg-blue-50">
        <CardContent className="pt-6">
          <h3 className="font-bold text-lg mb-2">🔍 DEBUG INFO</h3>
          <div className="space-y-1 font-mono text-sm">
            <p><strong>Books loaded:</strong> {books.length}</p>
            <p><strong>Books is array:</strong> {Array.isArray(books) ? '✅ YES' : '❌ NO'}</p>
            <p><strong>Books type:</strong> {typeof books}</p>
            <p><strong>Debug message:</strong> {debugInfo}</p>
            {books.length > 0 && (
              <p><strong>First book title:</strong> {books[0]?.title || 'N/A'}</p>
            )}
          </div>
          <Button onClick={loadData} className="mt-4" size="sm">🔄 Reload Data</Button>
        </CardContent>
      </Card>

      {/* Books Table */}
      <Card>
        <CardHeader>
          <CardTitle>Books Inventory ({books.length} books)</CardTitle>
        </CardHeader>
        <CardContent>
          {books.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Title</th>
                    <th className="text-left py-3 px-4">Author</th>
                    <th className="text-left py-3 px-4">Category</th>
                    <th className="text-center py-3 px-4">Available/Total</th>
                    <th className="text-left py-3 px-4">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book, index) => (
                    <tr key={book.id || index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{book.title || 'No title'}</p>
                          {book.subtitle && (
                            <p className="text-sm text-gray-500">{book.subtitle}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">{book.author || 'Unknown'}</td>
                      <td className="py-3 px-4">
                        {book.category ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {book.category}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${(book.available_copies || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {book.available_copies || 0} / {book.total_copies || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{book.location || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Book className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold">No books found!</p>
              <p className="text-sm text-gray-400 mt-2">Database has 8 books but they're not displaying</p>
              <p className="text-xs text-red-600 mt-2">Check the debug info above and browser console</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
