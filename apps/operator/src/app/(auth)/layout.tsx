type AuthLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center overflow-x-hidden bg-[#CFE0FF]">
      {children}
    </div>
  );
}
