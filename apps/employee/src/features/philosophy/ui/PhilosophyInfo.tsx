import type { Philosophy } from "../model/types";

type PhilosophyInfoProp = {
  philosophy: Philosophy;
};

export default function PhilosophyInfo({ philosophy }: PhilosophyInfoProp) {
  return (
    <div className="rounded-2xl bg-white px-6 py-8 shadow-lg sm:px-10 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        {philosophy.items.map((item) => (
          <section
            key={item.id}
            className="w-full max-w-4xl py-3 first:pt-0 last:pb-0 [&:not(:first-child)]:mt-8 sm:[&:not(:first-child)]:mt-10"
          >
            <div className="text-base font-medium tracking-tight text-slate-600 sm:text-[1.25rem] sm:leading-none">
              {item.label}
            </div>
            <div className="mt-3 whitespace-pre-wrap break-words text-xl font-bold leading-relaxed text-slate-900 sm:text-[1.7rem] sm:leading-[1.5]">
              {item.content}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
