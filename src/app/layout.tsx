import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Engenharia Reversa da Urna Eletrônica | Auditoria de Arquivos TSE',
  description: 'Decodificador e auditor independente de Boletim de Urna (.dat / ASN.1 DER) e Registro de Log (.jez)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#070d18] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
