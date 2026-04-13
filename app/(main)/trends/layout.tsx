/** Same horizontal rhythm as the home dashboard — wide canvas, breathable padding. */
export default function TrendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-24 pt-8 sm:px-6">
      {children}
    </div>
  );
}
