import { useState } from 'react';
import { Button } from '@/components/ui/button';

function App() {
  return (
    <>
      <h1 className='text-3xl font-bold underline'>
        Hello world!
      </h1>
      <div className='flex flex-col items-center justify-center min-h-svh'>
        <Button>Click me</Button>
      </div>
    </>
  );
}

export default App;
