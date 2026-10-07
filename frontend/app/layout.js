import './globals.css';

export const metadata = {
  title: 'KLE Inter College Hackathon 2K26',
  description: 'KLE Inter College Hackathon 2K26 — 10 & 11 October 2026. Build in Healthcare, Fintech, AgriTech, EdTech, Sustainability, Cybersecurity, AI/ML or Open Innovation.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;700&family=Sora:wght@300;400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
