'use client';

import { Guard } from '../components/guard';
import { HomeScreen } from '../components/home-screen';

export default function HomePage() {
  return <Guard allow="ready">{(s) => (s.name === 'ready' ? <HomeScreen active={s.active} /> : null)}</Guard>;
}
