type BaseTileProps = React.PropsWithChildren<{
  className?: string;
}>;
export default function BaseTile({ className = "", children }: BaseTileProps) {
  return <div className={`bg-white rounded-xl p-6 ${className}`}>{children}</div>;
}
