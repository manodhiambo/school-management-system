import { Outlet } from 'react-router-dom';
import { Button } from '@school/shared-ui';
import { cn } from '@school/shared-ui';

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div>
      <header>
        <h1>School Admin Portal</h1>
        <Button onClick={() => window.location.href = '/login'}>Logout</Button>
      </header>
      <main className={cn('main-content')}>
        {children || <Outlet />}
      </main>
    </div>
  );
};
