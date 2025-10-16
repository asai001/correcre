import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserShield } from "@fortawesome/free-solid-svg-icons";

export default function User() {
  return (
    <div className="flex justify-between items-center bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 lg:gap-5">
        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
          <FontAwesomeIcon icon={faUserShield} className="text-xl text-white" />
        </div>

        <div className="">
          <div className="font-bold lg:text-lg">管理者 さん</div>
          <div className="lg:text-base text-gray-600">システム管理者</div>
        </div>
      </div>
      <div className="">
        <div className="lg:text-base text-gray-600">管理対象従業員数</div>
        <div className="lg:text-sm text-gray-600">18名</div>
      </div>
    </div>
  );
}
