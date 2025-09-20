'use client';

import { useEffect } from 'react';
import { useGameStore } from './store/rootStore';
import { mockGame } from './testing/mockGame';
import { MapView } from './components/MapView';
import { HUD } from './components/HUD';

export default function Home() {
  const { init, map } = useGameStore((state) => ({ init: state.init, map: state.map }));

  useEffect(() => {
    init(mockGame);
  }, [init]);

  if (!map.tiles.length) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <MapView map={map} />
      <HUD map={map} />
    </div>
  );
}
