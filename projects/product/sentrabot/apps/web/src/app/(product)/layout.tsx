import "../globals.css";

export default function ProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div data-theme="light" className="sentrabot-product">
      {children}
    </div>
  );
}
