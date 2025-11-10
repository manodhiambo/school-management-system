import React, { useState } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { useToast } from '@school/shared-ui';

export const Announcements: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    toast({ title: 'Announcement sent' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Announcements</CardTitle>
      </CardHeader>
      <CardContent>
        <Input 
          placeholder="Title" 
          value={title} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} 
        />
        <textarea 
          placeholder="Content" 
          value={content} 
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)} 
        />
        <Button onClick={handleSubmit}>Send</Button>
      </CardContent>
    </Card>
  );
};
