import type { Philosophy } from "../model/types";

type PhilosophyInfoProp = {
  philosophy: Philosophy;
};

export default function PhilosophyInfo({ philosophy }: PhilosophyInfoProp) {
  return (
    <div className="rounded-2xl bg-white px-2 py-4 shadow-lg sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        {philosophy.items.map((item) => (
          <section key={item.id} className="w-full max-w-4xl [&:not(:first-child)]:mt-2 sm:[&:not(:first-child)]:mt-6">
            <div className="text-base font-medium tracking-tight text-slate-600 sm:text-lg sm:leading-none">{item.label}</div>
            <div className="mt-1 sm:mt-2 whitespace-pre-wrap break-words text-xl font-bold leading-relaxed text-slate-900 sm:text-xl sm:leading-[1.5]">
              {item.content}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
