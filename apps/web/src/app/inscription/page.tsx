'use client';

import { Guard } from '../../components/guard';
import { SignupScreen } from '../../components/signup-screen';

export default function SignupPage() {
  return <Guard allow="needsSignup">{() => <SignupScreen />}</Guard>;
}
