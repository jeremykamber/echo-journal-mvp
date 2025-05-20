import { Button } from '@/components/ui/button';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
      <h1 className="text-6xl font-serif mb-4">404</h1>
      <p className="text-lg mb-8">Sorry, the page you are looking for does not exist. </p>
      <p className="text-lg mb-8">Want to write an entry about it?</p>

      <div className="flex space-x-4">
        <Button
          onClick={() => navigate('/')}
        >
          Go Back Home
        </Button>
        <Button
          onClick={() => window.location.href = "mailto:hello@bringforth.dev"}
          variant={"outline"}
        >
          Contact Us
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
