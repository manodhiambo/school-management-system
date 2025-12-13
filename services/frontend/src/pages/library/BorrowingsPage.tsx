import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, User, AlertCircle } from 'lucide-react';
import libraryAPI from '@/services/library-api';

export function BorrowingsPage() {
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<any>(null);
  const [issueForm, setIssueForm] = useState({
    book_id: '',
    member_id: '',
    due_date: ''
  });
  const [returnForm, setReturnForm] = useState({
    condition_on_return: 'good',
    remarks: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading borrowings data...');
      
      const [borrowingsRes, booksRes] = await Promise.all([
        libraryAPI.getAllBorrowings({ limit: 100 }),
        libraryAPI.getBooks({ available: 'true', limit: 100 })
      ]);

      console.log('Borrowings response:', borrowingsRes);
      console.log('Books response:', booksRes);

      const borrowingsData = borrowingsRes?.data?.data || borrowingsRes?.data || [];
      const booksData = booksRes?.data?.data || booksRes?.data || [];

      console.log('Extracted borrowings:', borrowingsData);
      console.log('Extracted books:', booksData);

      setBorrowings(Array.isArray(borrowingsData) ? borrowingsData : []);
      setBooks(Array.isArray(booksData) ? booksData : []);
    } catch (error: any) {
      console.error('Error loading borrowings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issueForm.book_id || !issueForm.member_id || !issueForm.due_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      console.log('Issuing book:', issueForm);
      await libraryAPI.issueBook(issueForm);
      alert('Book issued successfully!');
      setShowIssueModal(false);
      setIssueForm({ book_id: '', member_id: '', due_date: '' });
      await loadData();
    } catch (error: any) {
      console.error('Error issuing book:', error);
      alert(error?.response?.data?.message || error?.message || 'Failed to issue book');
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrowing) return;

    try {
      console.log('Returning book:', selectedBorrowing.id);
      const response = await libraryAPI.returnBook(selectedBorrowing.id, returnForm);
      console.log('Return response:', response);
      
      const fineAmount = response?.data?.fine_amount || 0;
      
      if (fineAmount > 0) {
        alert(`Book returned successfully! Fine: KES ${fineAmount}`);
      } else {
        alert('Book returned successfully!');
      }
      
      setShowReturnModal(false);
      setSelectedBorrowing(null);
      setReturnForm({ condition_on_return: 'good', remarks: '' });
      await loadData();
    } catch (error: any) {
      console.error('Error returning book:', error);
      alert(error?.response?.data?.message || error?.message || 'Failed to return book');
    }
  };

  const openReturnModal = (borrowing: any) => {
    console.log('Opening return modal for:', borrowing);
    setSelectedBorrowing(borrowing);
    setShowReturnModal(true);
  };

  const getStatusBadge = (status: string) => {
    const colors: any = {
      issued: 'bg-blue-100 text-blue-700',
      returned: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      lost: 'bg-gray-100 text-gray-700',
      damaged: 'bg-orange-100 text-orange-700'
    };
    return <Badge className={colors[status] || 'bg-gray-100 text-gray-700'}>{status}</Badge>;
  };

  const calculateDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeBorrowings = borrowings.filter(b => b.status === 'issued' || (b.status === 'issued' && isOverdue(b.due_date)));
  const completedBorrowings = borrowings.filter(b => b.status === 'returned');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Book Borrowings</h2>
          <p className="text-gray-500">Issue and return books</p>
        </div>
        <Button onClick={() => { 
          setIssueForm({ ...issueForm, due_date: calculateDefaultDueDate() }); 
          setShowIssueModal(true); 
        }}>
          <BookOpen className="h-4 w-4 mr-2" />
          Issue Book
        </Button>
      </div>

      {/* Debug Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm">
            <strong>Total Borrowings:</strong> {borrowings.length} | 
            <strong className="ml-2">Active:</strong> {activeBorrowings.length} | 
            <strong className="ml-2">Returned:</strong> {completedBorrowings.length}
          </p>
        </CardContent>
      </Card>

      {/* Active Borrowings */}
      <Card>
        <CardHeader>
          <CardTitle>Active Borrowings ({activeBorrowings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeBorrowings.map((borrowing) => {
              const isLate = isOverdue(borrowing.due_date);
              return (
                <div key={borrowing.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{borrowing.title}</h4>
                        {getStatusBadge(isLate ? 'overdue' : borrowing.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{borrowing.author}</p>
                      
                      <div className="grid gap-2 md:grid-cols-3 text-sm">
                        <div className="flex items-center text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          <span>{borrowing.first_name} {borrowing.last_name} ({borrowing.membership_number})</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Issued: {new Date(borrowing.issue_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span className={isLate ? 'text-red-600 font-medium' : ''}>
                            Due: {new Date(borrowing.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {borrowing.fine_amount > 0 && (
                        <div className="mt-2 flex items-center text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span>Fine: KES {parseFloat(borrowing.fine_amount).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReturnModal(borrowing)}
                    >
                      Return Book
                    </Button>
                  </div>
                </div>
              );
            })}

            {activeBorrowings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No active borrowings
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completed Borrowings */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Returned ({completedBorrowings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {completedBorrowings.slice(0, 10).map((borrowing) => (
              <div key={borrowing.id} className="p-3 border rounded flex justify-between items-center">
                <div>
                  <p className="font-medium">{borrowing.title}</p>
                  <p className="text-sm text-gray-500">
                    {borrowing.first_name} {borrowing.last_name} • 
                    Returned: {borrowing.return_date ? new Date(borrowing.return_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                {getStatusBadge(borrowing.status)}
              </div>
            ))}

            {completedBorrowings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No completed borrowings
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Issue Book Modal */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Book</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleIssue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="book">Book *</Label>
              <select
                id="book"
                value={issueForm.book_id}
                onChange={(e) => setIssueForm({...issueForm, book_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select a book</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title} - {book.author} ({book.available_copies} available)
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                {books.length} books available for borrowing
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member">Library Member ID *</Label>
              <Input
                id="member"
                value={issueForm.member_id}
                onChange={(e) => setIssueForm({...issueForm, member_id: e.target.value})}
                placeholder="Enter library member ID (e.g., LIB1234567890)"
                required
              />
              <p className="text-xs text-gray-500">
                Get the member ID from the user's profile or My Borrowed Books page
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={issueForm.due_date}
                onChange={(e) => setIssueForm({...issueForm, due_date: e.target.value})}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              <p className="text-xs text-gray-500">
                Default: 14 days from today
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowIssueModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Issue Book</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Book Modal */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return Book</DialogTitle>
          </DialogHeader>

          {selectedBorrowing && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="font-medium">{selectedBorrowing.title}</p>
              <p className="text-sm text-gray-600">
                {selectedBorrowing.first_name} {selectedBorrowing.last_name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Issued: {new Date(selectedBorrowing.issue_date).toLocaleDateString()} | 
                Due: {new Date(selectedBorrowing.due_date).toLocaleDateString()}
              </p>
              {isOverdue(selectedBorrowing.due_date) && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  ⚠️ This book is overdue. Fine will be calculated automatically.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleReturn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition on Return</Label>
              <select
                id="condition"
                value={returnForm.condition_on_return}
                onChange={(e) => setReturnForm({...returnForm, condition_on_return: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Input
                id="remarks"
                value={returnForm.remarks}
                onChange={(e) => setReturnForm({...returnForm, remarks: e.target.value})}
                placeholder="Any notes about the return"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <p className="font-medium text-blue-900">Fine Calculation:</p>
              <p className="text-blue-700">KES 10 per day for overdue books</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowReturnModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Confirm Return</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
