import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="grid outline-none min-h-[100svh] place-items-center bg-void px-5 text-center">
      <div>
        <p className="label text-red-text">404</p>
        <h1 className="display mt-5 text-[clamp(56px,9vw,140px)] text-text">
          Lost the <em>thread.</em>
        </h1>
        <p className="mt-6 text-[17px] text-silver">This page swung off somewhere.</p>
        <Link href="/" className="label link-underline mt-10 inline-block text-text">
          Back to the start
        </Link>
      </div>
    </main>
  );
}
