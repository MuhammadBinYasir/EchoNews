"use client";

export default function PrintActionButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-sm bg-[#c0152f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#a31126]"
    >
      Print or save as PDF
    </button>
  );
}
