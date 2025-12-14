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

      const [borrowingsRes, booksRes, membersRes] = await Promise.all([
        libraryAPI.getAllBorrowings({ limit: 100 }),
        libraryAPI.getBooks({ limit: 100 }),
        libraryAPI.getAllMembers()
      ]);

      console.log('Borrowings response:', borrowingsRes);
      console.log('Books response:', booksRes);

      const borrowingsData = borrowingsRes?.data?.data || borrowingsRes?.data || [];
      const booksData = booksRes?.data?.data || booksRes?.data || [];
      const membersData = membersRes?.data?.data || membersRes?.data || [];

      console.log('Extracted borrowings:', borrowingsData);
      console.log('Extracted books:', booksData);

      setBorrowings(Array.isArray(borrowingsData) ? borrowingsData : []);
      setBooks(Array.isArray(booksData) ? booksData : []);
      setMembers(Array.isArray(membersData) ? membersData : []);
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

      const fineAmount = response?.data?.data?.fine_amount || 0;

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

  const getStatusBadge = (status: string, isOverdue: boolean = false) => {
    if (isOverdue && status === 'issued') {
      return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
    }
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

  const activeBorrowings = borrowings.filter(b => b.status === 'issued');
  const completedBorrowings = borrowings.filter(b => b.status === 'returned');
  const availableBooks = books.filter(b => b.available_copies > 0);

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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Borrowings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{borrowings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeBorrowings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedBorrowings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Books</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableBooks.length}</div>
          </CardContent>
        </Card>
      </div>

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
                        <h4 className="font-semibold">{borrowing.book_title}</h4>
                        {getStatusBadge(borrowing.status, isLate)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{borrowing.book_author}</p>

                      <div className="grid gap-2 md:grid-cols-3 text-sm">
                        <div className="flex items-center text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          <span>{borrowing.member_name} ({borrowing.membership_number})</span>
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

                      {isLate && (
                        <div className="mt-2 flex items-center text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          <span>
                            Overdue by {Math.floor((new Date().getTime() - new Date(borrowing.due_date).getTime()) / (1000 * 60 * 60 * 24))} days
                          </span>
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
                  <p className="font-medium">{borrowing.book_title}</p>
                  <p className="text-sm text-gray-500">
                    {borrowing.member_name} •
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Issue Book</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleIssue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="book">Select Book *</Label>
              <select
                id="book"
                value={issueForm.book_id}
                onChange={(e) => setIssueForm({...issueForm, book_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Choose a book...</option>
                {availableBooks.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title} - {book.author} ({book.available_copies} available)
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                {availableBooks.length} books available for borrowing
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member">Select Library Member *</Label>
              <select
                id="member"
                value={issueForm.member_id}
                onChange={(e) => setIssueForm({...issueForm, member_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Choose a member...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.member_name} - {member.membership_number} ({member.member_type})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                {members.length} active library members
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

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <p className="font-medium text-blue-900">Important:</p>
              <ul className="text-blue-700 list-disc list-inside mt-1 space-y-1">
                <li>Ensure member has not exceeded their borrowing limit</li>
                <li>Check if member's membership is active and not expired</li>
                <li>Fine: KES 5 per day for overdue books</li>
              </ul>
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
              <p className="font-medium">{selectedBorrowing.book_title}</p>
              <p className="text-sm text-gray-600">
                {selectedBorrowing.member_name}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Issued: {new Date(selectedBorrowing.issue_date).toLocaleDateString()} |
                Due: {new Date(selectedBorrowing.due_date).toLocaleDateString()}
              </p>
              {isOverdue(selectedBorrowing.due_date) && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  ⚠️ This book is overdue. Fine will be calculated automatically (KES 5/day).
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
              <p className="text-blue-700">KES 5 per day for overdue books</p>
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
