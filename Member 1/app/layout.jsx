import './globals.css';

export const metadata = {
  title: 'CityPulse | Civic health dashboard',
  description: 'A live civic health dashboard for Riverton.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
