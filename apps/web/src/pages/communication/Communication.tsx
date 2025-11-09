import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent } from '@school/shared-ui';
import { MessageSquare, Send, Bell, Calendar } from 'lucide-react';
import Inbox from '../../components/Inbox';
import MessageComposer from '../../components/MessageComposer';
import Announcements from '../../components/Announcements';
import PTMScheduler from '../../components/PTMScheduler';

export default function Communication() {
  const [activeTab, setActiveTab] = useState('inbox');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Communication Center</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="ptm">Parent-Teacher Meeting</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <Inbox />
        </TabsContent>

        <TabsContent value="compose">
          <MessageComposer />
        </TabsContent>

        <TabsContent value="announcements">
          <Announcements />
        </TabsContent>

        <TabsContent value="ptm">
          <PTMScheduler />
        </TabsContent>
      </Tabs>
    </div>
  );
}
