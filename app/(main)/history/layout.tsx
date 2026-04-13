export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 pb-28 pt-10 sm:px-6">{children}</div>
  );
}
