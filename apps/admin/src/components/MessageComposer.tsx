import { useState } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';

export const MessageComposer: React.FC = () => {
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Message Composer</CardTitle>
      </CardHeader>
      <CardContent>
        <Input 
          placeholder="Recipients" 
          value={recipients} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipients(e.target.value)} 
        />
        <Input 
          placeholder="Subject" 
          value={subject} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)} 
        />
        <Button onClick={() => toast({ title: 'Sent' })}>Send</Button>
      </CardContent>
    </Card>
  );
};
