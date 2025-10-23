type BaseTileProps = React.PropsWithChildren<{
  className?: string;
}>;
export default function BaseTile({ className = "", children }: BaseTileProps) {
  return <div className={`bg-white rounded-xl p-3 lg:p-6 shadow-lg ${className}`}>{children}</div>;
}
