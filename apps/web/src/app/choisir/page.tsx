'use client';

import { Guard } from '../../components/guard';
import { PickerScreen } from '../../components/picker-screen';

export default function PickerPage() {
  return <Guard allow="needsPicker">{(s) => (s.name === 'needsPicker' ? <PickerScreen memberships={s.memberships} /> : null)}</Guard>;
}
