import { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { apiClient } from '@school/api-client';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';
import { Calendar } from 'lucide-react';

export default function PTMScheduler() {
  const [date, setDate] = useState('');
  const [timeSlots, setTimeSlots] = useState(['09:00', '10:00', '11:00']);
  const [selectedSlot, setSelectedSlot] = useState('');
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const scheduleMutation = useMutation(
    (data: any) => apiClient.request({
      url: '/api/v1/messages/parent-teacher-meeting',
      method: 'POST',
      data,
    }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('messages');
        addToast('success', 'PTM scheduled successfully');
        setDate('');
        setSelectedSlot('');
      },
      onError: () => {
        addToast('error', 'Failed to schedule PTM');
      },
    }
  );

  const handleSchedule = () => {
    if (!date || !selectedSlot) {
      addToast('error', 'Please select date and time slot');
      return;
    }
    scheduleMutation.mutate({
      date,
      timeSlot: selectedSlot,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Parent-Teacher Meeting</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Available Time Slots</label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-2 rounded border ${
                    selectedSlot === slot
                      ? 'bg-primary-600 text-white'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSchedule} disabled={scheduleMutation.isLoading}>
            <Calendar size={16} className="mr-2" />
            {scheduleMutation.isLoading ? 'Scheduling...' : 'Schedule PTM'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
