'use client';

<<<<<<< HEAD
=======
<<<<<<< HEAD
import { useEffect } from 'react';
import { useGameStore } from './store/rootStore';
import { mockGame } from './testing/mockGame';
=======
<<<<<<< HEAD
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
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
<<<<<<< HEAD
=======
=======
import { HUD } from './components/HUD';
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
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
<<<<<<< HEAD
=======

>>>>>>> 1d172d9 (fix: buid errors)
>>>>>>> c6deb4a (Apply patch /tmp/f5adf113-6af4-4459-ac50-8603d7e7d20e.patch)
>>>>>>> 6d9606c (Apply patch /tmp/883455a8-c25e-42f7-ba52-55e24169b2cd.patch)
}
