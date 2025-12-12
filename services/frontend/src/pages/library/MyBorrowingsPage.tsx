import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import libraryAPI from '@/services/library-api';

export function MyBorrowingsPage() {
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [borrowingsRes, memberRes] = await Promise.all([
        libraryAPI.getMyBorrowings(),
        libraryAPI.getMember()
      ]);

      setBorrowings(borrowingsRes.data.data || []);
      setMember(memberRes.data.data || null);
    } catch (error: any) {
      console.error('Error loading borrowings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    
    if (status === 'returned') {
      return <Badge className="bg-green-100 text-green-700">Returned</Badge>;
    }
    if (status === 'overdue' || (status === 'issued' && today > due)) {
      return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
    }
    if (status === 'issued') {
      return <Badge className="bg-blue-100 text-blue-700">Active</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const calculateDaysLeft = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeBorrowings = borrowings.filter(b => b.status === 'issued');
  const pastBorrowings = borrowings.filter(b => b.status !== 'issued');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">My Borrowed Books</h2>
        <p className="text-gray-500">View your borrowing history and active loans</p>
      </div>

      {/* Member Info */}
      {member && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-500">Member Number</p>
                <p className="font-semibold">{member.membership_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Books Limit</p>
                <p className="font-semibold">{member.max_books_allowed} books</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Currently Borrowed</p>
                <p className="font-semibold">{activeBorrowings.length} books</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Fines</p>
                <p className="font-semibold text-red-600">
                  KES {parseFloat(member.fine_amount || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Borrowings */}
      {activeBorrowings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Currently Borrowed</h3>
          {activeBorrowings.map((borrowing) => {
            const daysLeft = calculateDaysLeft(borrowing.due_date);
            return (
              <Card key={borrowing.id}>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="h-24 w-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded flex items-center justify-center text-white">
                        <Book className="h-8 w-8" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-lg">{borrowing.title}</h4>
                          <p className="text-sm text-gray-600">{borrowing.author}</p>
                        </div>
                        {getStatusBadge(borrowing.status, borrowing.due_date)}
                      </div>

                      <div className="grid gap-2 md:grid-cols-3 text-sm mt-4">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Issued: {new Date(borrowing.issue_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>Due: {new Date(borrowing.due_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          {daysLeft >= 0 ? (
                            <span className="text-green-600 font-medium">
                              {daysLeft} days remaining
                            </span>
                          ) : (
                            <span className="text-red-600 font-medium">
                              {Math.abs(daysLeft)} days overdue
                            </span>
                          )}
                        </div>
                      </div>

                      {borrowing.fine_amount > 0 && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-center">
                          <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                          <span className="text-sm text-red-700">
                            Fine: KES {parseFloat(borrowing.fine_amount).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Past Borrowings */}
      {pastBorrowings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Borrowing History</h3>
          <div className="space-y-3">
            {pastBorrowings.map((borrowing) => (
              <Card key={borrowing.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{borrowing.title}</h4>
                      <p className="text-sm text-gray-500">{borrowing.author}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(borrowing.status, borrowing.due_date)}
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(borrowing.issue_date).toLocaleDateString()} - 
                        {borrowing.return_date && ` ${new Date(borrowing.return_date).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {borrowings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Book className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No borrowing history</p>
            <p className="text-sm text-gray-400 mt-1">Browse the catalog to borrow books</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
