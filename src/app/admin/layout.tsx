export const metadata = {
  title: "Sanity Studio | Rotaract Bangalore East",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-hidden">
      {children}
    </div>
  );
}
