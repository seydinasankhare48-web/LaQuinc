'use client';

import { Guard } from '../../components/guard';
import { LoginScreen } from '../../components/login-screen';

export default function LoginPage() {
  return <Guard allow="signedOut">{() => <LoginScreen />}</Guard>;
}
