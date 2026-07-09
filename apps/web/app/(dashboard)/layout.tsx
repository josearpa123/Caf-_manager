const navItems = [
  { href: "/proveedores", label: "Proveedores" },
  { href: "/recepcion", label: "Recepción" },
  { href: "/bodega", label: "Bodega" },
  { href: "/pagos", label: "Pagos" },
  { href: "/facturacion", label: "Facturación" },
  { href: "/reportes", label: "Reportes" },
  { href: "/configuracion", label: "Configuración" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r p-4">
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm">
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
