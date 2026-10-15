import '../global.css';
import { Slot } from 'expo-router';

/** Racine de la navigation : affiche directement la route active. */
export default function RootLayout() {
  return <Slot />;
}
