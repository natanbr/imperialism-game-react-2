'use client';

import { MapView } from './components/MapView';
import { mockMap } from './testing/mockMap';

export default function Home() {
    
return (
    <div>
      <h1>Imperialism Prototype</h1>
      <MapView map={mockMap} />
    </div>
  );

}
