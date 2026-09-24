import './globals.css';

export const metadata = {
  title: 'CityPulse / Intelligence',
  description: 'Real-time civic health dashboard and intelligence layer.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}