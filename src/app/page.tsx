'use client';

import { HUD } from './components/HUD';
import { MapView } from './components/MapView';

export default function Home() {

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <MapView />
      <HUD />
    </div>
  );

}
