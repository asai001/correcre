import type { Philosophy } from "../model/types";

type PhilosophyInfoProp = {
  philosophy: Philosophy;
};

export default function PhilosophyInfo({ philosophy }: PhilosophyInfoProp) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 lg:space-y-6">
      {philosophy.corporatePhilosophy && (
        <div className="flex flex-col justify-center items-center text-center">
          <div className="text-md lg:text-lg text-gray-600">経営理念</div>
          <div className="text-md font-bold text-gray-800 lg:text-xl mt-1">{philosophy.corporatePhilosophy}</div>
        </div>
      )}

      {philosophy.purpose && (
        <div className="flex flex-col justify-center items-center text-center">
          <div className="text-md lg:text-lg text-gray-600">PURPOSE</div>
          <div className="text-md font-bold text-gray-800 lg:text-xl mt-1">{philosophy.purpose}</div>
        </div>
      )}
    </div>
  );
}
