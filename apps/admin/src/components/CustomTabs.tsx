"use client";

import { type KeyboardEvent, type ReactNode, useId, useState } from "react";

type TabItem = {
  label: string;
  content: ReactNode;
};

type CustomTabsProps = {
  tabs: TabItem[];
  defaultIndex?: number;
};

export default function CustomTabs({ tabs, defaultIndex = 0 }: CustomTabsProps) {
  const [value, setValue] = useState(defaultIndex);
  const tabGroupId = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setValue((index + 1) % tabs.length);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setValue((index - 1 + tabs.length) % tabs.length);
    }
  };

  return (
    <div className="mt-5">
      <div className="mb-2 rounded-md bg-slate-100 p-1">
        <div role="tablist" aria-label="分析レポートの切り替え" className="flex flex-wrap gap-2">
          {tabs.map((tab, index) => {
            const selected = value === index;

            return (
              <button
                key={`${tabGroupId}-tab-${index}`}
                type="button"
                role="tab"
                id={`${tabGroupId}-tab-${index}`}
                aria-controls={`${tabGroupId}-panel-${index}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setValue(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={[
                  "rounded-md px-6 py-3 text-[0.95rem] font-bold transition-all duration-200 ease-in-out",
                  selected
                    ? "bg-[linear-gradient(135deg,#667eea_0%,#764ba2_100%)] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((tab, index) => (
        <div
          key={`${tabGroupId}-panel-${index}`}
          role="tabpanel"
          hidden={value !== index}
          id={`${tabGroupId}-panel-${index}`}
          aria-labelledby={`${tabGroupId}-tab-${index}`}
        >
          {value === index ? tab.content : null}
        </div>
      ))}
    </div>
  );
}
