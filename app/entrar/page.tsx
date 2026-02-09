import { Suspense } from 'react';
import EntrarClient from './EntrarClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sand" />}>
      <EntrarClient />
    </Suspense>
  );
}