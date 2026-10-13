'use client';

import { Guard } from '../../components/guard';
import { PhoneScreen } from '../../components/phone-screen';

export default function PhonePage() {
  return <Guard allow="needsPhone">{() => <PhoneScreen />}</Guard>;
}
