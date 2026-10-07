import './globals.css';

export const metadata = {
  metadataBase: new URL('https://kle-hackathon-2k26.vercel.app'),
  title: {
    default: 'KLE Hackathon 2K26 — Build. Innovate. Transform.',
    template: '%s · KLE Hackathon 2K26'
  },
  description: 'KLE Inter College Hackathon 2K26 — 10 & 11 October 2026 at KLE BCA College, Mahalingpur. Build real-world solutions across eight official tracks.',
  keywords: ['KLE Hackathon 2K26', 'KLE BCA College', 'student hackathon', 'Mahalingpur hackathon', 'AI ML hackathon'],
  openGraph: {
    title: 'KLE Hackathon 2K26 — Build. Innovate. Transform.',
    description: 'A two-day innovation arena for KLE BCA students. 10 & 11 October 2026 · Eight official tracks · Teams of 2–4.',
    type: 'website',
    siteName: 'KLE Hackathon 2K26',
    images: [{ url: '/kle-logo.jpg', width: 651, height: 312, alt: 'KLE Hackathon 2K26' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KLE Hackathon 2K26',
    description: 'Build. Innovate. Transform. 10 & 11 October 2026 at KLE BCA College, Mahalingpur.',
    images: ['/kle-logo.jpg']
  },
  icons: { icon: '/icon.svg' }
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
